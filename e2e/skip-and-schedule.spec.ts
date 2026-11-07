import { test, expect, Page } from '@playwright/test';
import { enterAnonymousMode, scheduleEveryDay } from './helpers';

// Weightlifting program on every day with the given exercises
async function createLiftingProgram(page: Page, name: string, exercises: string[]) {
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

test.describe('Skip an exercise (#43)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterAnonymousMode(page);
  });

  test('skipping an exercise moves on and lets the workout finish without it', async ({ page }) => {
    await createLiftingProgram(page, 'Pull Day', ['Rows', 'Curls']);
    await page.getByRole('button', { name: 'Start' }).first().click();

    await expect(page.getByRole('heading', { name: 'Rows' })).toBeVisible();
    await page.getByRole('button', { name: 'Skip', exact: true }).click();

    // Next exercise opens; Finish still waits for it
    await expect(page.getByRole('heading', { name: 'Curls' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finish' })).toBeDisabled();

    await page.getByLabel('Reps', { exact: true }).fill('12');
    await page.getByRole('button', { name: /Log Set/ }).click();
    await expect(page.getByRole('button', { name: 'Finish' })).toBeEnabled();
    await page.getByRole('button', { name: 'Finish' }).click();

    // The workout details show the skip
    await expect(page.getByText('Done').first()).toBeVisible();
    await page.getByRole('button', { name: 'View Pull Day' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Skipped')).toBeVisible();
    await expect(dialog.getByText('Set 1')).toBeVisible();
  });

  test('a skip can be undone, and survives a reload', async ({ page }) => {
    await createLiftingProgram(page, 'Leg Day', ['Squat']);
    await page.getByRole('button', { name: 'Start' }).first().click();

    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(page.getByText('Skipped in this workout')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finish' })).toBeEnabled();

    await page.reload();
    await page.getByRole('button', { name: 'Continue' }).first().click();
    await expect(page.getByText('Skipped in this workout')).toBeVisible();

    await page.getByRole('button', { name: 'Undo skip' }).click();
    await expect(page.getByText('Skipped in this workout')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Finish' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();
  });
});

test.describe('Stop a schedule (#43)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterAnonymousMode(page);
    page.on('dialog', dialog => dialog.accept());
  });

  test('stopping removes upcoming sessions but keeps a started one; resume brings them back', async ({ page }) => {
    await createLiftingProgram(page, 'Daily Lift', ['Press']);
    await expect(page.getByRole('heading', { name: 'Daily Lift' })).toHaveCount(7);

    // Start today's workout, then stop the schedule
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.getByRole('button', { name: 'Back' }).click();

    await page.getByRole('button', { name: 'Programs' }).click();
    await page.getByRole('button', { name: 'Stop schedule of Daily Lift' }).click();
    await expect(page.getByText('Schedule stopped')).toBeVisible();

    await page.getByRole('button', { name: 'Calendar' }).click();
    await expect(page.getByRole('heading', { name: 'Daily Lift' })).toHaveCount(1);
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Tomorrow')).toHaveCount(0);

    // Stays stopped after a reload; still startable ad hoc
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Daily Lift' })).toHaveCount(1);
    await page.getByRole('button', { name: 'New workout' }).click();
    await expect(page.getByRole('button', { name: 'Continue Daily Lift now' })).toBeVisible();

    await page.getByRole('button', { name: 'Programs' }).click();
    await page.getByRole('button', { name: 'Resume schedule of Daily Lift' }).click();
    await page.getByRole('button', { name: 'Calendar' }).click();
    await expect(page.getByRole('heading', { name: 'Daily Lift' })).toHaveCount(7);
  });

  test('a skipped day can be started from New workout', async ({ page }) => {
    await createLiftingProgram(page, 'Arms', ['Curls']);
    page.removeAllListeners('dialog');
    page.on('dialog', dialog => dialog.accept(''));
    await page.getByRole('button', { name: 'Skip' }).first().click();
    await expect(page.getByText('Skipped').first()).toBeVisible();

    await page.getByRole('button', { name: 'New workout' }).click();
    await page.getByRole('button', { name: 'Start Arms now' }).click();
    await expect(page.getByRole('heading', { name: 'Curls' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('In Progress')).toBeVisible();
  });
});
