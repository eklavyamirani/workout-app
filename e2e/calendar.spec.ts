import { test, expect } from '@playwright/test';

test.describe('Rolling Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('shows scheduled sessions for weekly programs', async ({ page }) => {
    await page.goto('/');
    
    // Create a program scheduled for today's day of week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Daily Practice');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Specific days').click();
    
    // Select today and tomorrow
    await page.getByRole('button', { name: dayNames[dayOfWeek] }).click();
    await page.getByRole('button', { name: dayNames[(dayOfWeek + 1) % 7] }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    await page.getByPlaceholder('Activity name').fill('Practice');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Should see Today section with the program
    await expect(page.getByText('Today')).toBeVisible();
    await expect(page.getByText('Daily Practice').first()).toBeVisible();
    
    // Should see Tomorrow section
    await expect(page.getByText('Tomorrow')).toBeVisible();
  });

  test('shows flexible programs every day', async ({ page }) => {
    await page.goto('/');
    
    // Create a flexible program
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Anytime Workout');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Exercise');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Should see program listed for Today, Tomorrow, and other days
    await expect(page.getByText('Today')).toBeVisible();
    await expect(page.getByText('Tomorrow')).toBeVisible();
    
    // The program should appear multiple times (once per day)
    const programCards = page.getByText('Anytime Workout');
    await expect(programCards.first()).toBeVisible();
  });

  test('persists session completion state', async ({ page }) => {
    await page.goto('/');
    
    // Create and complete a session
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Quick Session');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Task');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Start and complete session
    await page.getByRole('button', { name: 'Start' }).first().click();
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();

    // Reload the page
    await page.reload();

    // Session should still be marked as done
    await expect(page.getByText('Done').first()).toBeVisible();
  });
});
