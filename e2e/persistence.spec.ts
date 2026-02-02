import { test, expect } from '@playwright/test';
import { setupProgram } from './helpers';

test.describe('Data Persistence', () => {
  test('program persists after page reload', async ({ page }) => {
    await setupProgram(page);

    // Verify we're on home page
    await expect(page.getByText('Week 1 of 12')).toBeVisible();

    // Reload the page
    await page.reload();

    // Should still be on home page with program loaded
    await expect(page.getByText('Week 1 of 12')).toBeVisible();
    await expect(page.getByText('Start Workout')).toBeVisible();
  });

  test('exercises persist after page reload', async ({ page }) => {
    await setupProgram(page);

    // Add a custom exercise
    await page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await page.getByRole('button', { name: /Add Exercise/i }).click();
    await page.getByPlaceholder('Exercise name').fill('Persistent Exercise');
    await page.locator('select').selectOption('T2');
    await page.getByPlaceholder('Muscle groups (comma separated)').fill('Test');
    await page.getByPlaceholder('Equipment').fill('None');
    await page.getByRole('button', { name: 'Add' }).last().click();

    // Verify it was added
    await expect(page.getByText('Persistent Exercise')).toBeVisible();

    // Reload the page
    await page.reload();

    // Navigate to exercises
    await page.getByRole('button', { name: 'Exercises', exact: true }).click();

    // Custom exercise should still be there
    await expect(page.getByText('Persistent Exercise')).toBeVisible();
  });

  test('completed workout persists and shows in last workout', async ({ page }) => {
    await setupProgram(page);

    // Start and complete a workout
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();

    // Skip through all exercises using the Next button (simpler approach)
    for (let i = 0; i < 3; i++) {
      const skipButton = page.getByRole('button', { name: 'Skip' });
      if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipButton.click();
      }
      await page.getByRole('button', { name: 'Next' }).click();
    }

    // Finish workout
    await page.getByRole('button', { name: 'Finish' }).click();

    // Reload page
    await page.reload();

    // Should see last workout info
    await expect(page.getByText('Last Workout')).toBeVisible();
  });

  test('next workout day updates after completing workout', async ({ page }) => {
    await setupProgram(page);

    // Initially Day 1 should be next
    await expect(page.locator('button').filter({ hasText: /Day 1.*Next/i })).toBeVisible();

    // Complete Day 1 workout using simplified approach
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();

    // Skip through all exercises using the Next button
    for (let i = 0; i < 3; i++) {
      const skipButton = page.getByRole('button', { name: 'Skip' });
      if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipButton.click();
      }
      await page.getByRole('button', { name: 'Next' }).click();
    }

    await page.getByRole('button', { name: 'Finish' }).click();

    // Day 2 should now be next
    await expect(page.locator('button').filter({ hasText: /Day 2.*Next/i })).toBeVisible();
  });

  test('starting weights are preserved in workout', async ({ page }) => {
    await setupProgram(page);

    // Start a workout
    await page.locator('button').filter({ hasText: /Day 1/ }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    // Weight should be pre-filled with our setup weight (135)
    const weightInput = page.locator('input[type="number"]').first();
    await expect(weightInput).toHaveValue('135');
  });

  test('fresh browser has no program and shows setup', async ({ page }) => {
    // Go to page with cleared storage
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Should see setup screen
    await expect(page.getByText('Welcome to GZCLP!')).toBeVisible();
  });
});
