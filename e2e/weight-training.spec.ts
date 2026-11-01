import { test, expect, Page } from '@playwright/test';
import { enterAnonymousMode } from './helpers';

/**
 * Regression tests for the weight training paper cuts (#16):
 * #17 decimal weights, #18 workout preview, #19 GZCLP day on the calendar,
 * #20 GZCLP rotation through the 4 days, #21 set inputs on a phone screen.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function createGZCLPProgram(page: Page) {
  await page.getByRole('button', { name: 'Create Program' }).click();
  await page.getByText('GZCLP Program').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  const weights = page.getByLabel(/starting weight/);
  const count = await weights.count();
  for (let i = 0; i < count; i++) {
    await weights.nth(i).fill('100');
  }
  await page.getByRole('button', { name: 'Create Program' }).click();
}

async function createWeightliftingProgram(page: Page) {
  await page.getByRole('button', { name: 'Create Program' }).click();
  await page.getByText('Weightlifting').first().click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder(/Strength Training/).fill('Push Day');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Specific days').click();
  await page.getByRole('button', { name: DAY_NAMES[new Date().getDay()] }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder('Exercise name').fill('Dumbbell Press');
  await page.getByRole('button', { name: 'Add Exercise' }).click();
  await page.getByRole('button', { name: 'Create Program' }).click();
}

async function logSet(page: Page, weight: string, reps: string) {
  await page.getByLabel('Weight (lbs)').fill(weight);
  await page.getByLabel('Reps', { exact: true }).fill(reps);
  await page.getByRole('button', { name: /Log Set \(/ }).click();
}

test.describe('Weight training', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterAnonymousMode(page);
  });

  test('accepts decimal weights (#17)', async ({ page }) => {
    await createWeightliftingProgram(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    const weight = page.getByLabel('Weight (lbs)');
    await weight.fill('');
    await weight.pressSequentially('22.5');
    await expect(weight).toHaveValue('22.5');
    await page.getByLabel('Increase weight').click();
    await expect(weight).toHaveValue('27.5');

    await logSet(page, '22.5', '10');
    await expect(page.locator('span.font-medium').filter({ hasText: '22.5 lbs × 10 reps' })).toBeVisible();
  });

  test('GZCLP starting weights accept decimals (#17)', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('GZCLP Program').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    const squat = page.getByLabel('Squat starting weight', { exact: true });
    await squat.pressSequentially('97.5');
    await expect(squat).toHaveValue('97.5');
  });

  test('set inputs fit on a phone (#21)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await createWeightliftingProgram(page);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.getByLabel('Weight (lbs)').fill('137.5');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    const labels = ['Decrease weight', 'Weight (lbs)', 'Increase weight', 'Decrease reps', 'Reps', 'Increase reps'];
    const boxes = await Promise.all(labels.map(async l => (await page.getByLabel(l, { exact: true }).boundingBox())!));
    // No two controls overlap
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlaps, `${labels[i]} overlaps ${labels[j]}`).toBe(false);
      }
    }
    // The whole weight is visible, not scrolled inside the box
    const clipped = await page.getByLabel('Weight (lbs)').evaluate(el => el.scrollWidth > el.clientWidth);
    expect(clipped).toBe(false);
  });

  test('GZCLP shows the day on the calendar and rotates through the days (#19, #20)', async ({ page }) => {
    await createGZCLPProgram(page);

    // Every day shows the next day of the rotation: Day 1 to start with
    await expect(page.getByText('Day 1 - Squat Focus').first()).toBeVisible();
    await expect(page.getByText('3 activities').first()).toBeVisible();

    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.getByText('Activity 1 of 3')).toBeVisible();
    for (const exercise of ['Squat', 'Bench Press', 'Lat Pulldown']) {
      await expect(page.getByRole('button', { name: exercise, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Romanian Deadlift' })).toHaveCount(0);

    for (const exercise of ['Squat', 'Bench Press', 'Lat Pulldown']) {
      await page.getByRole('button', { name: exercise, exact: true }).click();
      await logSet(page, '100', '5');
    }
    await page.getByRole('button', { name: 'Finish' }).click();

    // Today stays Day 1 (done); the next workout is Day 2
    await expect(page.getByText('Done')).toBeVisible();
    await expect(page.getByText('Day 1 - Squat Focus')).toHaveCount(1);
    await expect(page.getByText('Day 2 - Bench Focus').first()).toBeVisible();

    await page.getByRole('button', { name: 'Start' }).first().click();
    for (const exercise of ['Bench Press', 'Romanian Deadlift', 'Dumbbell Curl']) {
      await expect(page.getByRole('button', { name: exercise, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Squat', exact: true })).toHaveCount(0);
  });

  test('previews a workout without starting it (#18)', async ({ page }) => {
    await createGZCLPProgram(page);

    await page.getByRole('button', { name: 'Preview GZCLP Program' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Day 1 - Squat Focus')).toBeVisible();
    await expect(dialog.getByRole('listitem')).toHaveCount(3);
    await expect(dialog.getByText('Squat', { exact: true })).toBeVisible();
    // Tiers come from the day's slots: Bench Press is the T2 lift on Day 1
    await expect(dialog.getByText('T1 · 5×3+ · start 100 lbs')).toHaveCount(1);
    await expect(dialog.getByText('T2 · 3×10+ · start 100 lbs')).toHaveCount(1);
    await expect(dialog.getByText('T3 · 3×15+ · start 100 lbs')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    // Nothing was started
    await expect(page.getByText('In Progress')).toHaveCount(0);
  });
});
