import { Page } from '@playwright/test';

/**
 * Sets up a complete program for testing.
 * Creates a 4-day GZCLP program with default exercises and 135lb starting weights.
 */
export async function setupProgram(page: Page): Promise<void> {
  // Clear storage and start fresh
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Wait for setup screen
  await page.waitForSelector('text=Welcome to GZCLP!');

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

  // Fill all weight inputs with 135
  const weightInputs = page.locator('input[type="number"]');
  const count = await weightInputs.count();
  for (let i = 0; i < count; i++) {
    await weightInputs.nth(i).fill('135');
  }

  // Start program
  await page.getByRole('button', { name: 'Start Program' }).click();

  // Wait for home page
  await page.waitForSelector('text=Week 1 of 12');
}

/**
 * Completes a full workout session for testing.
 */
export async function completeWorkout(page: Page, day: string = 'Day 1'): Promise<void> {
  // Start the workout
  await page.locator('button').filter({ hasText: new RegExp(day) }).first().click();

  // Complete all exercises (T1, T2, T3 = 3 exercises)
  for (let exercise = 0; exercise < 3; exercise++) {
    // Skip warmup
    await page.getByRole('button', { name: 'Skip' }).click();

    // Determine number of sets based on tier
    const tierInfo = await page.locator('text=/T[123] -/').textContent();
    const sets = tierInfo?.includes('T1') ? 5 : 3;

    // Log all sets
    for (let i = 0; i < sets; i++) {
      await page.getByRole('button', { name: /Log Set/ }).click();
    }

    // Complete exercise
    await page.getByRole('button', { name: 'Complete Exercise' }).click();
  }

  // Finish workout
  await page.getByRole('button', { name: 'Finish' }).click();
}

/**
 * Clears all app data from localStorage.
 */
export async function clearAppData(page: Page): Promise<void> {
  await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('program:') || key.startsWith('exercises:') || key.startsWith('workout:')) {
        localStorage.removeItem(key);
      }
    });
  });
}
