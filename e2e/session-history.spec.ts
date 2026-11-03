import { test, expect, Page } from '@playwright/test';
import { enterAnonymousMode } from './helpers';

/**
 * - An in-progress workout survives a reload in the evening, when the UTC date is
 *   already tomorrow (sessions are keyed by the local date).
 * - Finished workouts can be opened to see what was logged, also on later days.
 * - A workout left unfinished on an earlier day (e.g. one that ran past midnight) can be
 *   continued from the past workouts list.
 * - Switching exercises fills the weight from that exercise's last session, not the
 *   previous exercise.
 */

// 5:30 pm in Los Angeles on Sunday 1 Nov 2026 = 01:30 UTC on 2 Nov
test.use({ timezoneId: 'America/Los_Angeles' });
const EVENING = new Date('2026-11-01T17:30:00-08:00');

async function createProgram(page: Page, name: string, exercises: string[]) {
  await page.getByRole('button', { name: 'Create Program' }).click();
  await page.getByText('Weightlifting').first().click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder(/Strength Training/).fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();
  // Flexible: shown every day, so the next days have cards too
  await page.getByText('Flexible').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  for (const exercise of exercises) {
    await page.getByPlaceholder('Exercise name').fill(exercise);
    await page.getByRole('button', { name: 'Add Exercise' }).click();
  }
  await page.getByRole('button', { name: 'Create Program' }).click();
}

async function logSet(page: Page, weight: string, reps: string) {
  await page.getByLabel('Weight (lbs)').fill(weight);
  await page.getByLabel('Reps', { exact: true }).fill(reps);
  await page.getByRole('button', { name: /Log Set \(/ }).click();
}

test.describe('Session history', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setSystemTime(EVENING);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterAnonymousMode(page);
  });

  test('an in-progress workout survives an evening reload', async ({ page }) => {
    await createProgram(page, 'Push Day', ['Bench Press']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await logSet(page, '135', '5');
    await page.getByRole('button', { name: 'Back' }).click();

    await page.reload();
    await expect(page.getByText('In Progress')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).first().click();
    await expect(page.getByText('Set 1', { exact: true })).toBeVisible();
    await expect(page.locator('span.font-medium').filter({ hasText: '135 lbs × 5 reps' })).toBeVisible();
  });

  test('a finished workout can be viewed, today and on later days', async ({ page }) => {
    await createProgram(page, 'Pull Day', ['Barbell Row', 'Curl']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await logSet(page, '95', '8');
    await page.getByLabel('Exercise notes').fill('Elbows tucked');
    await page.getByRole('button', { name: 'Curl', exact: true }).click();
    await logSet(page, '25', '12');
    await page.getByLabel('Session notes').fill('Felt strong');
    await page.getByRole('button', { name: 'Finish' }).click();

    // Today: the done card opens the details
    await page.getByRole('button', { name: 'View Pull Day' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Completed')).toBeVisible();
    await expect(dialog.getByText('95 lbs × 8 reps')).toBeVisible();
    await expect(dialog.getByText('25 lbs × 12 reps')).toBeVisible();
    await expect(dialog.getByText('Elbows tucked')).toBeVisible();
    await expect(dialog.getByText('Felt strong')).toBeVisible();
    await page.keyboard.press('Escape');

    // Next day: it is listed under Past workouts
    await page.clock.setSystemTime(new Date('2026-11-02T18:00:00-08:00'));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Past workouts' })).toBeVisible();
    await page.getByRole('button', { name: 'View Pull Day, Yesterday' }).click();
    await expect(dialog.getByText('95 lbs × 8 reps')).toBeVisible();
    await expect(dialog.getByText('Felt strong')).toBeVisible();
  });

  test('a workout that runs past midnight can be continued the next day', async ({ page }) => {
    await page.clock.setSystemTime(new Date('2026-11-01T23:40:00-08:00'));
    await page.reload();
    await createProgram(page, 'Leg Day', ['Squat']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await logSet(page, '185', '5');
    await page.getByRole('button', { name: 'Back' }).click();

    // 00:10: the calendar has moved on to 2 Nov; the 1 Nov workout is listed as not finished
    await page.clock.setSystemTime(new Date('2026-11-02T00:10:00-08:00'));
    await page.reload();
    await expect(page.getByText(/Not finished/)).toBeVisible();
    await page.getByRole('button', { name: 'Continue Leg Day, Yesterday' }).click();
    await expect(page.getByText('Set 1', { exact: true })).toBeVisible();
    await logSet(page, '185', '5');
    await page.getByRole('button', { name: 'Finish' }).click();

    // Both sets are on the 1 Nov workout, which is now finished
    await expect(page.getByRole('button', { name: 'Continue Leg Day, Yesterday' })).toHaveCount(0);
    await page.getByRole('button', { name: 'View Leg Day, Yesterday' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Completed')).toBeVisible();
    await expect(dialog.getByText('185 lbs × 5 reps')).toHaveCount(2);
  });

  test('switching exercises fills the weight from that exercise, not the previous one', async ({ page }) => {
    await createProgram(page, 'Full Body', ['Squat', 'Calf Raise']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await logSet(page, '185', '5');
    await page.getByRole('button', { name: 'Calf Raise', exact: true }).click();
    // Nothing logged for calf raises yet: not 185 from squats
    await expect(page.getByLabel('Weight (lbs)')).toHaveValue('0');
    await logSet(page, '0', '20');
    // Done tabs read "Squat ✓"
    await page.getByRole('button', { name: /^Squat( ✓)?$/ }).click();
    await expect(page.getByLabel('Weight (lbs)')).toHaveValue('185');
    await page.getByRole('button', { name: 'Finish' }).click();

    // Next session: each exercise starts from its own last session
    await page.clock.setSystemTime(new Date('2026-11-03T17:30:00-08:00'));
    await page.reload();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.getByLabel('Weight (lbs)')).toHaveValue('185');
    await expect(page.getByLabel('Reps', { exact: true })).toHaveValue('5');
    await page.getByRole('button', { name: 'Calf Raise', exact: true }).click();
    await expect(page.getByLabel('Weight (lbs)')).toHaveValue('0');
    await expect(page.getByLabel('Reps', { exact: true })).toHaveValue('20');
  });
});
