import { test, expect, Page } from '@playwright/test';
import { enterAnonymousMode, finishWorkout } from './helpers';

/**
 * Data logged for insights (decision 0019): warm-up sets, rest between sets, reps left
 * in the tank, GZCLP AMRAP sets and target reps, and the session's effort at Finish.
 */

async function createWeightliftingProgram(page: Page) {
  await page.getByRole('button', { name: 'Create Program' }).click();
  await page.getByText('Weightlifting').first().click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder(/Strength Training/).fill('Push Day');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Flexible').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder('Exercise name').fill('Bench Press');
  await page.getByRole('button', { name: 'Add Exercise' }).click();
  await page.getByRole('button', { name: 'Create Program' }).click();
}

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

async function logSet(page: Page, weight: string, reps: string) {
  await page.getByLabel('Weight (lbs)').fill(weight);
  await page.getByLabel('Reps', { exact: true }).fill(reps);
  await page.getByRole('button', { name: /Log (Set|Warm-up) \(/ }).click();
}

async function storedSets(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('sessions:'))!;
    return JSON.parse(localStorage.getItem(key)!).activities[0].sets;
  });
}

test.describe('Training data', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-06T10:00:00') });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterAnonymousMode(page);
  });

  test('an ad-hoc session logs warm-ups, rest, reps left and effort', async ({ page }) => {
    await createWeightliftingProgram(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Warm-ups stay on until turned off, and are numbered on their own
    await page.getByLabel('Warm-up set').check();
    await logSet(page, '45', '10');
    await expect(page.getByText('Log Warm-up 2')).toBeVisible();
    await page.clock.fastForward('01:00');
    await logSet(page, '95', '5');
    await page.getByLabel('Warm-up set').uncheck();
    await expect(page.getByText('Log Set 1')).toBeVisible();
    // Warm-ups aren't asked for reps left
    await expect(page.getByRole('group', { name: 'Reps left in the tank' })).toHaveCount(0);

    // Rest runs from the last set
    await page.clock.fastForward('02:05');
    await expect(page.getByText(/^Rest 2:0\d$/)).toBeVisible();
    await logSet(page, '135', '8');
    await page.getByRole('button', { name: '2 reps left' }).click();
    await expect(page.getByRole('button', { name: '2 reps left' })).toHaveAttribute('aria-pressed', 'true');

    await page.clock.fastForward('02:00');
    await logSet(page, '135', '7');
    // The earlier set now lists its details as text
    await expect(page.getByText(/^rest 2:0\d · 2 reps left$/)).toBeVisible();
    await expect(page.getByText('Warm-up 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Set 2', { exact: true })).toBeVisible();

    const sets = await storedSets(page);
    expect(sets.map((s: { isWarmup: boolean }) => s.isWarmup)).toEqual([true, true, false, false]);
    expect(sets[0].restDuration).toBeUndefined();
    expect(sets[1].restDuration).toBeGreaterThanOrEqual(60);
    expect(sets[2].rpe).toBe(8);
    expect(sets[3].restDuration).toBeGreaterThanOrEqual(120);
    // No plan to compare against without a GZCLP tier
    expect(sets.some((s: { isAmrap?: boolean; targetReps?: number }) => s.isAmrap || s.targetReps)).toBe(false);

    // Backing out of the effort dialog keeps the workout open
    await page.getByRole('button', { name: 'Finish', exact: true }).click();
    await page.getByRole('button', { name: 'Back to workout' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await finishWorkout(page, 7);
    const session = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.startsWith('sessions:'))!;
      return JSON.parse(localStorage.getItem(key)!);
    });
    expect(session.status).toBe('completed');
    expect(session.effort).toBe(7);

    await page.getByRole('button', { name: 'View Push Day' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/effort 7\/10/)).toBeVisible();
    await expect(dialog.getByText('Warm-up 2')).toBeVisible();
    await expect(dialog.getByText(/2 reps left/)).toBeVisible();
  });

  test('GZCLP marks the AMRAP set and sets that miss the target reps', async ({ page }) => {
    await createGZCLPProgram(page);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.getByRole('heading', { name: 'Squat' })).toBeVisible();

    // T1 is 5×3+: reps left is only asked on the AMRAP set
    await logSet(page, '100', '3');
    await expect(page.getByRole('group', { name: 'Reps left in the tank' })).toHaveCount(0);
    await logSet(page, '100', '2');
    await expect(page.getByText('target 3')).toBeVisible();
    await logSet(page, '100', '3');
    await logSet(page, '100', '3');
    await expect(page.getByText('AMRAP: as many reps as you can')).toBeVisible();
    await logSet(page, '100', '6');
    await expect(page.getByRole('group', { name: 'Reps left in the tank' })).toBeVisible();
    await page.getByRole('button', { name: '1 rep left' }).click();

    const sets = await storedSets(page);
    expect(sets.map((s: { isAmrap?: boolean }) => !!s.isAmrap)).toEqual([false, false, false, false, true]);
    expect(sets.every((s: { targetReps?: number }) => s.targetReps === 3)).toBe(true);
    expect(sets[4].rpe).toBe(9);
  });
});
