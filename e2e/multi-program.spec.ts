import { test, expect } from '@playwright/test';

test.describe('Multi-Program Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('can manage GZCLP, violin, and ballet programs together', async ({ page }) => {
    // Increase timeout for this complex test
    test.setTimeout(60000);
    
    await page.goto('/');

    // ========================================
    // 1. Create GZCLP Program
    // ========================================
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('GZCLP Program').click();
    
    // Name it
    await page.getByRole('textbox').fill('Strength Training');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Use default day configuration, continue
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Set starting weights (all to 100 lbs)
    const weightInputs = page.locator('input[type="number"]');
    const count = await weightInputs.count();
    for (let i = 0; i < count; i++) {
      await weightInputs.nth(i).fill('100');
    }
    await page.getByRole('button', { name: 'Create Program' }).click();
    
    // Wait for home page and verify GZCLP program shows
    await expect(page.getByText('Strength Training').first()).toBeVisible();

    // ========================================
    // 2. Create Violin Practice Program
    // ========================================
    // Go to Programs tab to find create button more reliably
    await page.getByRole('button', { name: 'Programs' }).click();
    await page.getByRole('button', { name: 'New Program' }).click();
    
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    await page.getByPlaceholder('e.g., Violin Practice').fill('Violin Practice');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Schedule: Flexible for simplicity
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Add activities
    await page.getByPlaceholder('Activity name').fill('Scales');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByPlaceholder('Activity name').fill('Etudes');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    
    await page.getByRole('button', { name: 'Create Program' }).click();
    
    // Verify we're back on home
    await expect(page.getByText('Violin Practice').first()).toBeVisible();

    // ========================================
    // 3. Create Ballet Practice Program
    // ========================================
    await page.getByRole('button', { name: 'Programs' }).click();
    await page.getByRole('button', { name: 'New Program' }).click();
    
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    await page.getByPlaceholder('e.g., Violin Practice').fill('Ballet Practice');
    await page.getByRole('button', { name: 'Continue' }).click();
    
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    await page.getByPlaceholder('Activity name').fill('Barre Work');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    
    await page.getByRole('button', { name: 'Create Program' }).click();

    // ========================================
    // 4. Verify all programs exist
    // ========================================
    await page.getByRole('button', { name: 'Programs' }).click();
    
    await expect(page.getByText('Strength Training').first()).toBeVisible();
    await expect(page.getByText('Violin Practice').first()).toBeVisible();
    await expect(page.getByText('Ballet Practice').first()).toBeVisible();
    
    // Count programs - should be 3
    const deleteButtons = page.getByRole('button', { name: 'Delete program' });
    await expect(deleteButtons).toHaveCount(3);

    // ========================================
    // 5. Verify calendar shows all programs
    // ========================================
    await page.getByRole('button', { name: 'Calendar' }).click();
    
    // All three should show (they're all flexible/rotation)
    await expect(page.getByText('Strength Training').first()).toBeVisible();
    await expect(page.getByText('Violin Practice').first()).toBeVisible();
    await expect(page.getByText('Ballet Practice').first()).toBeVisible();
    
    // Should have at least 3 Start buttons for today
    const startButtons = page.getByRole('button', { name: 'Start' });
    expect(await startButtons.count()).toBeGreaterThanOrEqual(3);
  });

  test('can complete sessions from different program types', async ({ page }) => {
    await page.goto('/');

    // Create a quick skill practice program
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Violin');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Practice');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Create another skill practice program
    await page.getByRole('button', { name: 'Programs' }).click();
    await page.getByRole('button', { name: 'New Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Ballet');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Warm-up');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Complete Violin session
    await page.getByRole('button', { name: 'Calendar' }).click();
    
    // Find Violin card and start
    const violinCard = page.locator('.bg-white.rounded-lg').filter({ hasText: 'Violin' }).first();
    await violinCard.getByRole('button', { name: 'Start' }).click();
    
    // Complete the session
    await page.getByRole('button', { name: /Start|Resume/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    
    // Violin should now show as done
    await expect(page.getByText('Done').first()).toBeVisible();
    
    // Ballet should still be available to start
    const balletStart = page.locator('.bg-white.rounded-lg').filter({ hasText: 'Ballet' }).first().getByRole('button', { name: 'Start' });
    await expect(balletStart).toBeVisible();
  });
});
