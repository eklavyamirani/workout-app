import { test, expect, Page } from '@playwright/test';
import { enterAnonymousMode, scheduleEveryDay } from './helpers';

/**
 * #65 Add an exercise mid-workout: only that workout gets it, unless asked.
 * #66 End an abandoned workout: its time ends at the last logged set.
 * #67 Mark an exercise done (read-only until Edit); notes from last time and a note
 *     for the next workout.
 */

test.use({ timezoneId: 'America/Los_Angeles' });
const MORNING = new Date('2026-11-10T10:00:00-08:00');

async function createProgram(page: Page, name: string, exercises: string[]) {
  await page.getByRole('button', { name: 'Create Program' }).click();
  await page.getByText('Weightlifting').first().click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder(/Strength Training/).fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();
  await scheduleEveryDay(page);
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

const tabs = (page: Page) => page.locator('div.overflow-x-auto').first();

test.describe('Mid-workout changes', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setSystemTime(MORNING);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterAnonymousMode(page);
  });

  test('an exercise added mid-workout is logged in that workout only (#65)', async ({ page }) => {
    await createProgram(page, 'Upper', ['Bench Press']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await logSet(page, '135', '5');

    // Added by mistake: removable while nothing is logged
    await page.getByRole('button', { name: 'Add exercise' }).click();
    await page.getByLabel('Name').fill('Dips');
    await page.getByRole('button', { name: 'Add to this workout' }).click();
    await expect(page.getByRole('heading', { name: 'Dips' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(tabs(page).getByRole('button', { name: /Dips/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Add exercise' }).click();
    await page.getByLabel('Name').fill('Pull-ups');
    await page.getByRole('button', { name: 'Add to this workout' }).click();
    await expect(page.getByRole('heading', { name: 'Pull-ups' })).toBeVisible();
    await expect(page.getByText('Activity 2 of 2')).toBeVisible();
    await logSet(page, '0', '8');

    // Survives leaving and continuing the workout
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Continue' }).first().click();
    await expect(tabs(page).getByRole('button', { name: /Pull-ups/ })).toBeVisible();
    await page.getByRole('button', { name: 'Finish' }).click();

    await page.getByRole('button', { name: 'View Upper' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Pull-ups')).toBeVisible();
    await expect(dialog.getByText('Bodyweight × 8 reps')).toBeVisible();
    await page.keyboard.press('Escape');

    // Tomorrow's plan is unchanged; Pull-ups can be added again from the program
    await page.clock.setSystemTime(new Date('2026-11-11T10:00:00-08:00'));
    await page.reload();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.getByText('Activity 1 of 1')).toBeVisible();
    await page.getByRole('button', { name: 'Add exercise' }).click();
    await page.getByRole('button', { name: 'Add Pull-ups' }).click();
    await expect(page.getByRole('heading', { name: 'Pull-ups' })).toBeVisible();
    // Prefilled from last time
    await expect(page.getByLabel('Reps', { exact: true })).toHaveValue('8');
  });

  test('an exercise added to the plan stays in later workouts (#65)', async ({ page }) => {
    await createProgram(page, 'Lower', ['Squat']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.getByRole('button', { name: 'Add exercise' }).click();
    await page.getByLabel('Name').fill('Calf Raise');
    await page.getByLabel(/Also add to every future workout/).check();
    await page.getByRole('button', { name: 'Add to this workout' }).click();
    await expect(page.getByRole('heading', { name: 'Calf Raise' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();

    await page.clock.setSystemTime(new Date('2026-11-11T10:00:00-08:00'));
    await page.reload();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.getByText('Activity 1 of 2')).toBeVisible();
    await expect(tabs(page).getByRole('button', { name: /Calf Raise/ })).toBeVisible();
  });

  test('mark an exercise done: read-only until Edit (#67)', async ({ page }) => {
    await createProgram(page, 'Push', ['Bench Press', 'Overhead Press']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await logSet(page, '135', '5');

    // Sets logged but not marked: in progress, not done
    const bench = tabs(page).getByRole('button', { name: /^Bench Press/ });
    await expect(bench).toHaveAttribute('title', 'In progress');

    await page.getByRole('button', { name: 'Mark exercise done' }).click();
    // Next open exercise opens; Bench Press is done
    await expect(page.getByRole('heading', { name: 'Overhead Press' })).toBeVisible();
    await expect(tabs(page).getByRole('button', { name: 'Bench Press ✓' })).toBeVisible();

    await tabs(page).getByRole('button', { name: 'Bench Press ✓' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Done' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Log Set \(/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete set 1' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('button', { name: /Log Set \(/ })).toBeVisible();
    await logSet(page, '135', '5');
    await expect(page.getByText('Set 2', { exact: true })).toBeVisible();
    await expect(bench).toHaveAttribute('title', 'In progress');
  });

  test('notes from last time and a note for the next workout (#67)', async ({ page }) => {
    await createProgram(page, 'Legs', ['Squat']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await logSet(page, '185', '5');
    await page.getByLabel('Exercise notes').fill('Knees out at the bottom');
    await page.getByLabel('Note for next workout').fill('Squat +5 lbs');
    await page.getByRole('button', { name: 'Finish' }).click();

    await page.clock.setSystemTime(new Date('2026-11-12T10:00:00-08:00'));
    await page.reload();
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.getByText('From last workout')).toBeVisible();
    await expect(page.getByText('Squat +5 lbs')).toBeVisible();
    const lastTime = page.getByRole('note', { name: 'Last time' });
    await expect(lastTime).toContainText('Tue, Nov 10');
    await expect(lastTime).toContainText('Knees out at the bottom');
    // This workout's own notes start empty
    await expect(page.getByLabel('Exercise notes')).toHaveValue('');
  });

  test('an abandoned workout can be ended; its time stops at the last set (#66)', async ({ page }) => {
    await createProgram(page, 'Pull', ['Row']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.clock.setSystemTime(new Date('2026-11-10T10:25:30-08:00'));
    await logSet(page, '95', '8');
    await page.getByRole('button', { name: 'Back' }).click();

    // Two days later it is still listed as not finished
    await page.clock.setSystemTime(new Date('2026-11-12T18:00:00-08:00'));
    await page.reload();
    await expect(page.getByText(/Not finished/)).toBeVisible();
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'End Pull, Tuesday, Nov 10' }).click();

    await expect(page.getByRole('button', { name: 'Continue Pull, Tuesday, Nov 10' })).toHaveCount(0);
    await expect(page.getByText(/Ended early · 1 exercise · 1 set · 25 min/)).toBeVisible();
    await page.getByRole('button', { name: 'View Pull, Tuesday, Nov 10' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Ended early · 25 min')).toBeVisible();
    await expect(dialog.getByText('95 lbs × 8 reps')).toBeVisible();
  });

  test('finishing a workout continued after a long break does not count the break (#66)', async ({ page }) => {
    await createProgram(page, 'Arms', ['Curl']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.clock.setSystemTime(new Date('2026-11-10T10:20:30-08:00'));
    await logSet(page, '25', '12');
    await page.getByRole('button', { name: 'Back' }).click();

    await page.clock.setSystemTime(new Date('2026-11-11T09:00:00-08:00'));
    await page.reload();
    await page.getByRole('button', { name: 'Continue Arms, Yesterday' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'View Arms, Yesterday' }).click();
    await expect(page.getByRole('dialog').getByText('Completed · 20 min')).toBeVisible();
  });
});
