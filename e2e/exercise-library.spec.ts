import { test, expect } from '@playwright/test';
import { setupProgram } from './helpers';

test.describe('Exercise Library', () => {
  test.beforeEach(async ({ page }) => {
    await setupProgram(page);
    await page.getByRole('button', { name: 'Exercises', exact: true }).click();
    // Wait for Exercise Library to load
    await page.waitForSelector('text=T1 Exercises');
  });

  test('displays exercises grouped by tier', async ({ page }) => {
    await expect(page.getByText('T1 Exercises')).toBeVisible();
    await expect(page.getByText('T2 Exercises')).toBeVisible();
    await expect(page.getByText('T3 Exercises')).toBeVisible();
  });

  test('shows default T1 exercises', async ({ page }) => {
    await expect(page.getByText('Squat').first()).toBeVisible();
    await expect(page.getByText('Bench Press').first()).toBeVisible();
    await expect(page.getByText('Deadlift').first()).toBeVisible();
    await expect(page.getByText('Overhead Press').first()).toBeVisible();
  });

  test('shows default T2 exercises', async ({ page }) => {
    await expect(page.getByText('Romanian Deadlift')).toBeVisible();
    await expect(page.getByText('Incline Bench Press')).toBeVisible();
    await expect(page.getByText('Barbell Row')).toBeVisible();
  });

  test('shows default T3 exercises', async ({ page }) => {
    await expect(page.getByText('Lat Pulldown')).toBeVisible();
    await expect(page.getByText('Cable Fly')).toBeVisible();
    await expect(page.getByText('Face Pull')).toBeVisible();
  });

  test('shows muscle groups and equipment for exercises', async ({ page }) => {
    // Check Squat details
    await expect(page.getByText('Quads, Glutes')).toBeVisible();
    await expect(page.getByText('Barbell').first()).toBeVisible();
  });

  test('shows Add Exercise button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Add Exercise/i })).toBeVisible();
  });

  test('can open add exercise form', async ({ page }) => {
    await page.getByRole('button', { name: /Add Exercise/i }).click();

    await expect(page.getByText('New Exercise')).toBeVisible();
    await expect(page.getByPlaceholder('Exercise name')).toBeVisible();
    await expect(page.getByPlaceholder('Muscle groups (comma separated)')).toBeVisible();
    await expect(page.getByPlaceholder('Equipment')).toBeVisible();
  });

  test('can add a custom exercise', async ({ page }) => {
    await page.getByRole('button', { name: /Add Exercise/i }).click();

    // Fill in the form
    await page.getByPlaceholder('Exercise name').fill('Dumbbell Fly');
    await page.locator('select').selectOption('T3');
    await page.getByPlaceholder('Muscle groups (comma separated)').fill('Chest');
    await page.getByPlaceholder('Equipment').fill('Dumbbell');

    // Add the exercise
    await page.getByRole('button', { name: 'Add' }).last().click();

    // Verify it appears in T3 section with Custom badge
    await expect(page.getByText('Dumbbell Fly')).toBeVisible();
    await expect(page.getByText('Custom').first()).toBeVisible();
  });

  test('add button is disabled without exercise name', async ({ page }) => {
    await page.getByRole('button', { name: /Add Exercise/i }).click();

    const addButton = page.getByRole('button', { name: 'Add' }).last();
    await expect(addButton).toBeDisabled();
  });

  test('can cancel adding exercise', async ({ page }) => {
    await page.getByRole('button', { name: /Add Exercise/i }).click();
    await page.getByPlaceholder('Exercise name').fill('Test');

    await page.getByRole('button', { name: 'Cancel' }).click();

    // Form should be hidden
    await expect(page.getByText('New Exercise')).not.toBeVisible();
  });

  test('custom exercise shows Custom badge', async ({ page }) => {
    // Add a custom exercise
    await page.getByRole('button', { name: /Add Exercise/i }).click();
    await page.getByPlaceholder('Exercise name').fill('Custom Press');
    await page.locator('select').selectOption('T1');
    await page.getByPlaceholder('Muscle groups (comma separated)').fill('Shoulders');
    await page.getByPlaceholder('Equipment').fill('Barbell');
    await page.getByRole('button', { name: 'Add' }).last().click();

    // Find the custom exercise row and verify badge
    const customRow = page.locator('.bg-gray-50').filter({ hasText: 'Custom Press' });
    await expect(customRow.getByText('Custom', { exact: true })).toBeVisible();
  });

  test('default exercises do not show Custom badge', async ({ page }) => {
    const squatRow = page.locator('.bg-gray-50').filter({ hasText: /^Squat/ });
    await expect(squatRow.getByText('Custom')).not.toBeVisible();
  });
});
