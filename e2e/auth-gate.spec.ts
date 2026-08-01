import { test, expect } from '@playwright/test';

test.describe('Auth Gate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('shows auth gate on first visit', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /try without/i })).toBeVisible();
    // Home screen should not be visible
    await expect(page.getByText('No programs yet')).not.toBeVisible();
  });

  test('anonymous mode — enter and use app', async ({ page }) => {
    await page.getByRole('button', { name: /try without/i }).click();

    // Home screen should render
    await expect(page.getByText('No programs yet')).toBeVisible();

    // Verify localStorage auth mode
    const authMode = await page.evaluate(() => localStorage.getItem('__auth_mode'));
    expect(authMode).toBe('anonymous');
  });

  test('anonymous mode — create program works', async ({ page }) => {
    await page.getByRole('button', { name: /try without/i }).click();

    // Create a skill practice program
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

    // Program should appear
    await expect(page.getByText('Test Program').first()).toBeVisible();
  });

  test('anonymous mode — data persists across reload', async ({ page }) => {
    await page.getByRole('button', { name: /try without/i }).click();

    // Create a program
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Persistent Program');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Activity');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    await expect(page.getByText('Persistent Program').first()).toBeVisible();

    // Reload and verify data persists
    await page.reload();

    // Should NOT show auth gate (stays in anonymous mode)
    await expect(page.getByRole('button', { name: /try without/i })).not.toBeVisible();

    // Program should still be visible
    await expect(page.getByText('Persistent Program').first()).toBeVisible();
  });

  test('anonymous mode — no API calls', async ({ page }) => {
    let apiCallCount = 0;
    await page.route('/api/**', (route) => {
      apiCallCount++;
      route.continue();
    });

    await page.getByRole('button', { name: /try without/i }).click();

    // Create a program
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('No Sync Program');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Activity');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Wait a bit to ensure no delayed API calls
    await page.waitForTimeout(3000);

    expect(apiCallCount).toBe(0);
  });

  test('anonymous mode — preserves existing localStorage data', async ({ page }) => {
    // Inject program data into localStorage before entering anonymous mode
    await page.evaluate(() => {
      const programId = 'test-program-123';
      const program = {
        id: programId,
        name: 'Injected Program',
        type: 'skill',
        schedule: { mode: 'flexible' },
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const activity = {
        id: 'activity-1',
        programId: programId,
        name: 'Injected Activity',
        order: 0,
      };
      localStorage.setItem('programs:list', JSON.stringify([programId]));
      localStorage.setItem(`programs:${programId}`, JSON.stringify(program));
      localStorage.setItem(`activities:${programId}`, JSON.stringify([activity]));
    });

    await page.reload();

    // Enter anonymous mode
    await page.getByRole('button', { name: /try without/i }).click();

    // Go to Programs view to verify the injected program is there
    await page.getByRole('button', { name: 'Programs' }).click();
    await expect(page.getByText('Injected Program').first()).toBeVisible();
  });
});
