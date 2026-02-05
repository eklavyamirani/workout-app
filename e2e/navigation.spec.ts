import { test, expect } from '@playwright/test';
import { setupProgram } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupProgram(page);
  });

  test('header displays app title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Workout Tracker' })).toBeVisible();
  });

  test('header shows Home and Exercises navigation buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Exercises', exact: true })).toBeVisible();
  });

  test('Home button is active on home page', async ({ page }) => {
    const homeButton = page.getByRole('button', { name: 'Home', exact: true });
    await expect(homeButton).toHaveClass(/bg-blue-100/);
  });

  test('can navigate to Exercises page', async ({ page }) => {
    await page.getByRole('button', { name: 'Exercises', exact: true }).click();

    // Exercises button should now be active
    const exercisesButton = page.getByRole('button', { name: 'Exercises', exact: true });
    await expect(exercisesButton).toHaveClass(/bg-blue-100/);

    // Should see exercise library content
    await expect(page.getByText('T1 Exercises')).toBeVisible();
  });

  test('can navigate back to Home from Exercises', async ({ page }) => {
    await page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await page.getByRole('button', { name: 'Home', exact: true }).click();

    // Home button should be active again
    const homeButton = page.getByRole('button', { name: 'Home', exact: true });
    await expect(homeButton).toHaveClass(/bg-blue-100/);

    // Should see home page content
    await expect(page.getByText('Week 1 of 12')).toBeVisible();
  });

  test('Back button in Exercise Library navigates to Home', async ({ page }) => {
    await page.getByRole('button', { name: 'Exercises', exact: true }).click();
    await page.getByRole('button', { name: /Back/i }).click();

    await expect(page.getByText('Week 1 of 12')).toBeVisible();
  });
});
