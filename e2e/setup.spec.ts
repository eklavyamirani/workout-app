import { test, expect } from '@playwright/test';

test.describe('Program Setup', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('shows welcome screen on first visit', async ({ page }) => {
    await expect(page.getByText('Welcome to GZCLP!')).toBeVisible();
    await expect(page.getByText('GZCLP Structure:')).toBeVisible();
    await expect(page.getByText('T1: Main compound lift')).toBeVisible();
  });

  test('displays all four day tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Day 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Day 2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Day 3' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Day 4' })).toBeVisible();
  });

  test('can select T1 exercise for a day', async ({ page }) => {
    // Click on Squat for T1
    await page.getByRole('button', { name: /Squat/i }).first().click();

    // Verify it's selected (has blue border)
    const squatButton = page.getByRole('button', { name: /Squat/i }).first();
    await expect(squatButton).toHaveClass(/border-blue-500/);
  });

  test('can select T2 exercise for a day', async ({ page }) => {
    // Click on Romanian Deadlift for T2
    await page.getByRole('button', { name: /Romanian Deadlift/i }).click();

    // Verify it's selected
    const rdlButton = page.getByRole('button', { name: /Romanian Deadlift/i });
    await expect(rdlButton).toHaveClass(/border-blue-500/);
  });

  test('can select multiple T3 exercises', async ({ page }) => {
    // Select multiple T3 exercises
    await page.locator('button:has(div.font-semibold:text-is("Lat Pulldown"))').click();
    await page.locator('button:has(div.font-semibold:text-is("Cable Fly"))').click();

    // Verify both are selected (have blue border)
    await expect(page.locator('button:has(div.font-semibold:text-is("Lat Pulldown"))')).toHaveClass(/border-blue-500/);
    await expect(page.locator('button:has(div.font-semibold:text-is("Cable Fly"))')).toHaveClass(/border-blue-500/);
  });

  test('can switch between days', async ({ page }) => {
    // Select exercises for Day 1
    await page.getByRole('button', { name: /Squat/i }).first().click();

    // Switch to Day 2
    await page.getByRole('button', { name: 'Day 2' }).click();

    // Verify Day 2 is active and exercises are unselected
    await expect(page.getByRole('button', { name: 'Day 2' })).toHaveClass(/bg-blue-500/);
    const squatButton = page.getByRole('button', { name: /Squat/i }).first();
    await expect(squatButton).not.toHaveClass(/border-blue-500/);
  });

  test('continue button is disabled until all exercises are selected', async ({ page }) => {
    const continueButton = page.getByRole('button', { name: 'Continue to Starting Weights' });
    await expect(continueButton).toBeDisabled();
  });

  test('can add custom exercise', async ({ page }) => {
    // Click Add Custom button
    await page.getByRole('button', { name: /Add Custom/i }).click();

    // Fill in custom exercise details
    await page.getByPlaceholder('Exercise name').fill('Power Clean');
    await page.getByRole('combobox').selectOption('T1');
    await page.getByPlaceholder('Muscle groups (comma separated)').fill('Back, Legs, Shoulders');
    await page.getByPlaceholder('Equipment').fill('Barbell');

    // Add the exercise - use exact match to avoid "Add Custom" button
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    // Verify custom exercise appears in T1 list
    await expect(page.getByRole('button', { name: /Power Clean/i })).toBeVisible();
  });

  test('can cancel adding custom exercise', async ({ page }) => {
    await page.getByRole('button', { name: /Add Custom/i }).click();
    await page.getByPlaceholder('Exercise name').fill('Test Exercise');

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Form should be hidden
    await expect(page.getByPlaceholder('Exercise name')).not.toBeVisible();
  });

  test('complete setup flow and reach home page', async ({ page }) => {
    // Setup Day 1: Squat (T1), Romanian Deadlift (T2), Lat Pulldown (T3)
    await page.locator('button:has(div.font-semibold:text-is("Squat"))').click();
    await page.locator('button:has(div.font-semibold:text-is("Romanian Deadlift"))').click();
    await page.locator('button:has(div.font-semibold:text-is("Lat Pulldown"))').click();

    // Setup Day 2: Bench Press (T1), Barbell Row (T2), Cable Fly (T3)
    await page.getByRole('button', { name: 'Day 2' }).click();
    await page.locator('button:has(div.font-semibold:text-is("Bench Press"))').click();
    await page.locator('button:has(div.font-semibold:text-is("Barbell Row"))').click();
    await page.locator('button:has(div.font-semibold:text-is("Cable Fly"))').click();

    // Setup Day 3: Deadlift (T1), Incline Bench Press (T2), Leg Curl (T3)
    await page.getByRole('button', { name: 'Day 3' }).click();
    await page.locator('button:has(div.font-semibold:text-is("Deadlift"))').click();
    await page.locator('button:has(div.font-semibold:text-is("Incline Bench Press"))').click();
    await page.locator('button:has(div.font-semibold:text-is("Leg Curl"))').click();

    // Setup Day 4: Overhead Press (T1), Front Squat (T2), Face Pull (T3)
    await page.getByRole('button', { name: 'Day 4' }).click();
    await page.locator('button:has(div.font-semibold:text-is("Overhead Press"))').click();
    await page.locator('button:has(div.font-semibold:text-is("Front Squat"))').click();
    await page.locator('button:has(div.font-semibold:text-is("Face Pull"))').click();

    // Continue to weights
    await page.getByRole('button', { name: 'Continue to Starting Weights' }).click();

    // Should see starting weights page
    await expect(page.getByText('Starting Weights')).toBeVisible();

    // Fill in weights for each exercise
    const weightInputs = page.locator('input[type="number"]');
    const count = await weightInputs.count();
    for (let i = 0; i < count; i++) {
      await weightInputs.nth(i).fill('135');
    }

    // Start program
    await page.getByRole('button', { name: 'Start Program' }).click();

    // Should be on home page
    await expect(page.getByText('Week 1 of 12')).toBeVisible();
    await expect(page.getByText('Start Workout')).toBeVisible();
  });

  test('can go back from weights page to exercise selection', async ({ page }) => {
    // Setup all days with the same exercises
    for (const day of ['Day 1', 'Day 2', 'Day 3', 'Day 4']) {
      if (day !== 'Day 1') {
        await page.getByRole('button', { name: day }).click();
      }
      await page.locator('button:has(div.font-semibold:text-is("Squat"))').click();
      await page.locator('button:has(div.font-semibold:text-is("Romanian Deadlift"))').click();
      await page.locator('button:has(div.font-semibold:text-is("Lat Pulldown"))').click();
    }

    await page.getByRole('button', { name: 'Continue to Starting Weights' }).click();
    await expect(page.getByText('Starting Weights')).toBeVisible();

    // Go back
    await page.getByRole('button', { name: 'Back' }).click();

    // Should be back on exercise selection
    await expect(page.getByText('Welcome to GZCLP!')).toBeVisible();
  });

  test('start program button is disabled until all weights are entered', async ({ page }) => {
    // Setup all days with the same exercises
    for (const day of ['Day 1', 'Day 2', 'Day 3', 'Day 4']) {
      if (day !== 'Day 1') {
        await page.getByRole('button', { name: day }).click();
      }
      await page.locator('button:has(div.font-semibold:text-is("Squat"))').click();
      await page.locator('button:has(div.font-semibold:text-is("Romanian Deadlift"))').click();
      await page.locator('button:has(div.font-semibold:text-is("Lat Pulldown"))').click();
    }

    await page.getByRole('button', { name: 'Continue to Starting Weights' }).click();

    // Start Program should be disabled
    const startButton = page.getByRole('button', { name: 'Start Program' });
    await expect(startButton).toBeDisabled();
  });
});
