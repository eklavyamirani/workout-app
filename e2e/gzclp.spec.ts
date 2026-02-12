import { test, expect } from '@playwright/test';

test.describe('GZCLP Program', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('can create a GZCLP program with 4-day split', async ({ page }) => {
    await page.goto('/');
    
    // Start creating a program
    await page.getByRole('button', { name: 'Create Program' }).click();
    
    // Select GZCLP
    await page.getByText('GZCLP Program').click();
    
    // Step 1: Name
    await expect(page.getByText('GZCLP Setup')).toBeVisible();
    await expect(page.getByText('About GZCLP')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Step 2: Configure Days
    await expect(page.getByText('Configure Workout Days')).toBeVisible();
    
    // Should see 4 day tabs
    await expect(page.getByRole('button', { name: 'Day 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Day 2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Day 3' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Day 4' })).toBeVisible();
    
    // Should see T1, T2, T3 sections
    await expect(page.getByText('T1 - Main Lift')).toBeVisible();
    await expect(page.getByText('T2 - Secondary Lift')).toBeVisible();
    await expect(page.getByText('T3 - Accessories')).toBeVisible();
    
    // Default exercises should be pre-selected
    // Continue to weights step
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Step 3: Starting Weights
    await expect(page.getByText('Set Starting Weights')).toBeVisible();
    
    // Should see exercises with weight inputs
    await expect(page.getByText('Squat', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Bench Press').first()).toBeVisible();
    
    // Fill in weights for all exercises
    const weightInputs = page.locator('input[type="number"]');
    const count = await weightInputs.count();
    for (let i = 0; i < count; i++) {
      await weightInputs.nth(i).fill('100');
    }
    
    // Create program
    await page.getByRole('button', { name: 'Create Program' }).click();
    
    // Should be back on home with program visible
    await expect(page.getByText('GZCLP Program').first()).toBeVisible();
  });

  test('can add custom exercises during GZCLP setup', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('GZCLP Program').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Click Add Exercise link (not button in modal)
    await page.getByRole('button', { name: 'Add Exercise' }).first().click();
    
    // Fill in custom exercise
    await expect(page.getByText('Add Custom Exercise')).toBeVisible();
    await page.getByPlaceholder('e.g., Hip Thrust').fill('Hip Thrust');
    await page.getByRole('combobox').selectOption('T2');
    // Click the modal's Add Exercise button
    await page.locator('.fixed button').filter({ hasText: 'Add Exercise' }).click();
    
    // Custom exercise should now be available in T2 section
    await expect(page.getByText('Hip Thrust')).toBeVisible();
  });

  test('shows tier information correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('GZCLP Program').click();
    
    // Check tier descriptions in the info box
    await expect(page.getByText('T1: Main compound lift (5×3+)')).toBeVisible();
    await expect(page.getByText('T2: Secondary compound (3×10+)')).toBeVisible();
    await expect(page.getByText('T3: Accessories (3×15+)')).toBeVisible();
  });
});
