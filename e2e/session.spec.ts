import { test, expect } from '@playwright/test';

test.describe('Session Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('can start and complete a duration-based session', async ({ page }) => {
    await page.goto('/');
    
    // Create a weekly skill program for today only
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Meditation');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Specific days').click();
    await page.getByRole('button', { name: dayNames[dayOfWeek] }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Breathing');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Start the session (only one Start button should be visible for today)
    await page.getByRole('button', { name: 'Start' }).first().click();
    
    // Verify session view
    await expect(page.getByRole('heading', { name: 'Meditation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Breathing' })).toBeVisible();
    await expect(page.getByText('00:00')).toBeVisible();

    // Start timer (the Play button in session view)
    await page.getByRole('button', { name: /Start|Resume/ }).click();
    
    // Wait a moment for timer to run
    await page.waitForTimeout(1500);
    
    // Timer should show some time elapsed
    await expect(page.getByText(/00:0[1-9]/)).toBeVisible();

    // Mark activity as done
    await page.getByRole('button', { name: 'Done' }).click();

    // Complete the session
    await page.getByRole('button', { name: 'Finish' }).click();

    // Should be back on home page with session marked complete
    await expect(page.getByText('Done').first()).toBeVisible();
  });

  test('can skip a session', async ({ page }) => {
    await page.goto('/');
    
    // Create a weekly program for today
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Yoga');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Specific days').click();
    await page.getByRole('button', { name: dayNames[dayOfWeek] }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Sun Salutation');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Skip the session
    page.on('dialog', async dialog => {
      await dialog.accept('Feeling tired');
    });
    await page.locator('button[title="Skip"]').first().click();

    // Session should be marked as skipped
    await expect(page.getByText('Skipped')).toBeVisible();
  });

  test('can log sets for weightlifting session', async ({ page }) => {
    await page.goto('/');
    
    // Create a weekly weightlifting program for today
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Weightlifting').first().click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder(/Strength Training/).fill('Push Day');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Specific days').click();
    await page.getByRole('button', { name: dayNames[dayOfWeek] }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Exercise name').fill('Bench Press');
    await page.getByRole('button', { name: 'Add Exercise' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Start the session (first Start button for today)
    await page.getByRole('button', { name: 'Start' }).first().click();
    
    // Verify session view for weightlifting
    await expect(page.getByRole('heading', { name: 'Push Day' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible();
    await expect(page.getByText('Weight (lbs)')).toBeVisible();
    // Verify the log set button is present (contains "reps")
    await expect(page.getByRole('button', { name: /Log Set/ })).toBeVisible();

    // Log a set
    await page.locator('input[type="number"]').first().fill('135');
    await page.locator('input[type="number"]').nth(1).fill('10');
    await page.getByRole('button', { name: /Log Set.*135.*10/ }).click();

    // Verify set was logged
    await expect(page.getByText('Set 1')).toBeVisible();
    // The span element contains the set details
    await expect(page.locator('span.font-medium').filter({ hasText: '135 lbs' })).toBeVisible();

    // Complete the session
    await page.getByRole('button', { name: 'Finish' }).click();

    // Should be back on home page
    await expect(page.getByText('Done')).toBeVisible();
  });
});
