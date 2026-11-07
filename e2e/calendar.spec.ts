import { test, expect } from '@playwright/test';
import { enterAnonymousMode, scheduleEveryDay, startNow } from './helpers';

test.describe('Rolling Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterAnonymousMode(page);
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

  test('flexible programs have no recurring cards; New workout starts one today (#43)', async ({ page }) => {
    await page.goto('/');

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

    // No card on any day until a session is started
    await expect(page.getByText('No sessions scheduled for the next 7 days.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Anytime Workout' })).toHaveCount(0);

    await startNow(page, 'Anytime Workout');
    await expect(page.getByRole('heading', { name: 'Anytime Workout' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();

    // Only today has the started session
    await expect(page.getByText('Today')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Tomorrow')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Anytime Workout' })).toHaveCount(1);
  });

  test('persists session completion state', async ({ page }) => {
    await page.goto('/');
    
    // Create and complete a session
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Quick Session');
    await page.getByRole('button', { name: 'Continue' }).click();
    await scheduleEveryDay(page);
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
