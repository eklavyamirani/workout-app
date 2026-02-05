import { test, expect } from '@playwright/test';
import { setupProgram } from './helpers';

test.describe('Workout Session', () => {
  test.beforeEach(async ({ page }) => {
    await setupProgram(page);
  });

  test('home page shows all workout days', async ({ page }) => {
    // Look for day buttons specifically (not the "Next up: Day X" text)
    await expect(page.locator('button').filter({ hasText: /^Day 1/ })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /^Day 2/ })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /^Day 3/ })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /^Day 4/ })).toBeVisible();
  });

  test('Day 1 is marked as Next on fresh program', async ({ page }) => {
    const day1Card = page.locator('button').filter({ hasText: /Day 1.*Next/i });
    await expect(day1Card).toBeVisible();
  });

  test('can start a workout', async ({ page }) => {
    // Click on Day 1 to start workout
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();

    // Should see exercise view with first exercise (Squat)
    await expect(page.getByRole('heading', { name: 'Squat' })).toBeVisible();
    await expect(page.getByText('T1 - 5 x 3+')).toBeVisible();
  });

  test('shows warm-up section initially', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();

    await expect(page.getByText('Warm-up Sets')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
  });

  test('can log warm-up set', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();

    // Enter warm-up set data
    await page.locator('input[type="number"]').first().fill('95');
    await page.locator('input[type="number"]').nth(1).fill('10');

    // Log the warm-up set
    await page.getByRole('button', { name: 'Log Warm-up Set' }).click();

    // Should see logged warm-up set
    await expect(page.getByText('95 lbs × 10')).toBeVisible();
  });

  test('can skip warm-up and go to working sets', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();

    await page.getByRole('button', { name: 'Skip' }).click();

    // Should see working sets section
    await expect(page.getByText('Working Sets')).toBeVisible();
    await expect(page.getByText('Set 1 of 5')).toBeVisible();
  });

  test('working sets are pre-filled with suggested weight', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    // Weight should be pre-filled with 135 (our setup weight)
    const weightInput = page.locator('input[type="number"]').first();
    await expect(weightInput).toHaveValue('135');
  });

  test('can adjust weight using quick buttons', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    // Click +5 button
    await page.getByRole('button', { name: '+5' }).click();

    const weightInput = page.locator('input[type="number"]').first();
    await expect(weightInput).toHaveValue('140');

    // Click -5 button
    await page.getByRole('button', { name: '-5' }).click();
    await expect(weightInput).toHaveValue('135');

    // Click +10 button
    await page.getByRole('button', { name: '+10' }).click();
    await expect(weightInput).toHaveValue('145');
  });

  test('can adjust reps using quick buttons', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    const repsInput = page.locator('input[type="number"]').nth(1);
    // Wait for reps input to have a value (default is 3 for T1 exercises)
    await expect(repsInput).toHaveValue('3');
    const initialReps = 3;

    // Click +1 button
    await page.getByRole('button', { name: '+1', exact: true }).click();
    await expect(repsInput).toHaveValue(String(initialReps + 1));

    // Click -1 button
    await page.getByRole('button', { name: '-1', exact: true }).click();
    await expect(repsInput).toHaveValue(String(initialReps));
  });

  test('can log a working set', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    // Log the first set
    await page.getByRole('button', { name: /Log Set/ }).click();

    // Should see the logged set and move to set 2
    await expect(page.getByText('135 lbs × 3', { exact: true })).toBeVisible();
    await expect(page.getByText('Set 2 of 5')).toBeVisible();
  });

  test('rest timer starts after logging a set', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    // Log a set
    await page.getByRole('button', { name: /Log Set/ }).click();

    // Rest timer should appear
    await expect(page.getByText('Rest Timer')).toBeVisible();
    await expect(page.getByText(/0:\d{2}/)).toBeVisible();
  });

  test('AMRAP label appears on last set', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    // Log 4 sets to get to the 5th (AMRAP) set
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /Log Set/ }).click();
    }

    // Should see AMRAP label on set 5
    await expect(page.getByText('Set 5 of 5')).toBeVisible();
    await expect(page.locator('.text-blue-600').filter({ hasText: 'AMRAP' })).toBeVisible();
  });

  test('AMRAP checkbox is auto-checked on AMRAP set', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    // Log 4 sets
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /Log Set/ }).click();
    }

    // AMRAP checkbox should be checked
    const amrapCheckbox = page.locator('input[type="checkbox"]');
    await expect(amrapCheckbox).toBeChecked();
  });

  test('Complete Exercise button appears after all sets', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    // Log all 5 sets
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /Log Set/ }).click();
    }

    // Should see Complete Exercise button
    await expect(page.getByRole('button', { name: 'Complete Exercise' })).toBeVisible();
  });

  test('can navigate to next exercise using Next button', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    // Click Next to go to next exercise
    await page.getByRole('button', { name: 'Next' }).click();

    // Should see second exercise (Romanian Deadlift - T2)
    await expect(page.getByRole('heading', { name: 'Romanian Deadlift' })).toBeVisible();
    await expect(page.getByText('T2 - 3 x 10+')).toBeVisible();
  });

  test('can cancel workout and return to home', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();

    // Click cancel (back arrow)
    await page.locator('button').filter({ has: page.locator('svg') }).first().click();

    // Should be back on home page
    await expect(page.getByText('Week 1 of 12')).toBeVisible();
  });

  test('complete full workout shows completion screen', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();

    // Skip through all exercises using the Next button (simpler approach)
    // There are 3 exercises in Day 1
    for (let i = 0; i < 3; i++) {
      // Skip warmup if visible
      const skipButton = page.getByRole('button', { name: 'Skip' });
      if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipButton.click();
      }
      // Click Next to move to next exercise (or complete if last)
      await page.getByRole('button', { name: 'Next' }).click();
    }

    // Should see workout complete screen
    await expect(page.getByText('Workout Complete!')).toBeVisible();
  });

  test('finish button returns to home after workout', async ({ page }) => {
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();

    // Skip through all exercises using Next button
    for (let i = 0; i < 3; i++) {
      const skipButton = page.getByRole('button', { name: 'Skip' });
      if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipButton.click();
      }
      await page.getByRole('button', { name: 'Next' }).click();
    }

    // Click Finish
    await page.getByRole('button', { name: 'Finish' }).click();

    // Should be on home page
    await expect(page.getByText('Week 1 of 12')).toBeVisible();
  });
});
