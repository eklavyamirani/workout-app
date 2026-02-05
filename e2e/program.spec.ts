import { test, expect } from '@playwright/test';

test.describe('Program Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('shows empty state when no programs exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('No programs yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Program' })).toBeVisible();
  });

  test('can create a skill practice program', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Step 1: Select program type
    await expect(page.getByText('What kind of program?')).toBeVisible();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Name the program
    await expect(page.getByText('Name your program')).toBeVisible();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Violin Practice');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Configure schedule
    await expect(page.getByText('When do you practice?')).toBeVisible();
    await page.getByText('Specific days').click();
    await page.getByRole('button', { name: 'Mon' }).click();
    await page.getByRole('button', { name: 'Wed' }).click();
    await page.getByRole('button', { name: 'Fri' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 4: Add activities
    await expect(page.getByText('Add activities')).toBeVisible();
    await page.getByPlaceholder('Activity name').fill('Scales');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await expect(page.getByText('Scales')).toBeVisible();
    
    await page.getByPlaceholder('Activity name').fill('Etudes');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await expect(page.getByText('Etudes')).toBeVisible();

    await page.getByRole('button', { name: 'Create Program' }).click();

    // Verify program was created (multiple instances on calendar for each scheduled day)
    await expect(page.getByText('Violin Practice').first()).toBeVisible();
  });

  test('can create a weightlifting program', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Step 1: Select program type
    await page.getByText('Weightlifting').first().click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Name the program
    await page.getByPlaceholder(/Strength Training/).fill('Strength Training');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: Configure schedule - use interval
    await page.getByText('Every X days').click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 4: Add exercises
    await page.getByPlaceholder('Exercise name').fill('Squat');
    await page.getByRole('button', { name: 'Add Exercise' }).click();
    await expect(page.getByText('Squat')).toBeVisible();

    await page.getByRole('button', { name: 'Create Program' }).click();

    // Verify program was created (may appear multiple times on calendar)
    await expect(page.getByText('Strength Training').first()).toBeVisible();
  });

  test('can delete a program', async ({ page }) => {
    await page.goto('/');
    
    // Create a program first
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Test Program');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Test Activity');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Go to programs view
    await page.getByRole('button', { name: 'Programs' }).click();
    await expect(page.getByText('Test Program').first()).toBeVisible();

    // Delete the program
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete program' }).click();

    // Verify program was deleted
    await expect(page.getByText('Your Programs')).toBeVisible();
    await expect(page.getByText('No programs yet')).toBeVisible();
  });
});
