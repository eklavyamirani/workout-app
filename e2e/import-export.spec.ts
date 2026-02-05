import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('can export a program', async ({ page }) => {
    // Create a program first
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('My Violin Program');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Scales');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Go to programs view
    await page.getByRole('button', { name: 'Programs' }).click();
    await expect(page.getByText('My Violin Program').first()).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.getByRole('button', { name: 'Export program' }).click();
    
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toBe('my-violin-program.json');
    
    // Save and verify content
    const downloadPath = path.join('/tmp', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const content = fs.readFileSync(downloadPath, 'utf-8');
    const data = JSON.parse(content);
    
    expect(data.version).toBe(1);
    expect(data.program.name).toBe('My Violin Program');
    expect(data.program.type).toBe('skill');
    expect(data.activities).toHaveLength(1);
    expect(data.activities[0].name).toBe('Scales');
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('can import a program', async ({ page }) => {
    // Create a valid export file
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      program: {
        id: 'test_program',
        name: 'Imported Program',
        type: 'cardio',
        schedule: { mode: 'weekly', daysOfWeek: [1, 3, 5] },
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      activities: [
        { id: 'act1', name: 'Running', programId: 'test_program', trackingType: 'duration', targetDuration: 30 },
        { id: 'act2', name: 'Cycling', programId: 'test_program', trackingType: 'duration', targetDuration: 45 },
      ],
    };
    
    const filePath = '/tmp/test-import.json';
    fs.writeFileSync(filePath, JSON.stringify(exportData));

    await page.goto('/');
    
    // Go to programs view
    await page.getByRole('button', { name: 'Programs' }).click();
    
    // Import the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Verify program was imported
    await expect(page.getByText('Imported Program').first()).toBeVisible();
    await expect(page.getByText('Cardio')).toBeVisible();
    await expect(page.getByText('2 activities')).toBeVisible();
    
    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('handles duplicate names on import', async ({ page }) => {
    // Create a program with a specific name
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Duplicate Test');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Activity');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Create an import file with the same name
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      program: {
        id: 'dup_program',
        name: 'Duplicate Test',
        type: 'skill',
        schedule: { mode: 'flexible' },
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      activities: [
        { id: 'act1', name: 'Other Activity', programId: 'dup_program', trackingType: 'duration' },
      ],
    };
    
    const filePath = '/tmp/test-duplicate.json';
    fs.writeFileSync(filePath, JSON.stringify(exportData));

    // Go to programs view
    await page.getByRole('button', { name: 'Programs' }).click();
    
    // Import the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Verify program was imported with renamed name
    await expect(page.getByText('Duplicate Test (1)').first()).toBeVisible();
    
    // Both programs should exist
    await expect(page.getByText('Duplicate Test').first()).toBeVisible();
    
    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('can import a previously exported program', async ({ page }) => {
    // Create a program
    await page.getByRole('button', { name: 'Create Program' }).click();
    await page.getByText('Skill Practice').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('e.g., Violin Practice').fill('Export Test Program');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Flexible').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByPlaceholder('Activity name').fill('Test Activity');
    await page.getByRole('button', { name: 'Add Activity' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    // Go to programs view
    await page.getByRole('button', { name: 'Programs' }).click();
    await expect(page.getByText('Export Test Program').first()).toBeVisible();

    // Export the program
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export program' }).click();
    const download = await downloadPromise;
    
    // Save the exported file
    const downloadPath = path.join('/tmp', 'export-test.json');
    await download.saveAs(downloadPath);
    
    // Log the exported content for debugging
    const exportedContent = fs.readFileSync(downloadPath, 'utf-8');
    console.log('Exported content:', exportedContent);
    
    // Delete the original program
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete program' }).click();
    
    // Verify it's deleted
    await expect(page.getByText('No programs yet')).toBeVisible();
    
    // Import the exported file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(downloadPath);
    
    // Wait a moment for the import to process
    await page.waitForTimeout(500);
    
    // Verify program was imported
    await expect(page.getByText('Export Test Program').first()).toBeVisible();
    await expect(page.getByText('1 activity')).toBeVisible();
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('import works when navigating from calendar to programs', async ({ page }) => {
    // This simulates a more realistic flow where user is on home, then goes to programs to import
    
    // Create export file
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      program: {
        id: 'nav_test_program',
        name: 'Navigation Test',
        type: 'skill',
        schedule: { mode: 'flexible' },
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      activities: [
        { id: 'act1', name: 'Nav Activity', programId: 'nav_test_program', trackingType: 'duration', targetDuration: 20 },
      ],
    };
    
    const filePath = '/tmp/nav-test-import.json';
    fs.writeFileSync(filePath, JSON.stringify(exportData));
    
    // Start on home page (empty state)
    await page.goto('/');
    await expect(page.getByText('No programs yet')).toBeVisible();
    
    // Navigate to Programs tab
    await page.getByRole('button', { name: 'Programs' }).click();
    await expect(page.getByText('Your Programs')).toBeVisible();
    
    // Import the file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for import
    await page.waitForTimeout(500);
    
    // Verify program appears
    await expect(page.getByText('Navigation Test').first()).toBeVisible();
    
    // Navigate back to Calendar and verify program shows there too
    await page.getByRole('button', { name: 'Calendar' }).click();
    await expect(page.getByText('Navigation Test').first()).toBeVisible();
    
    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('rejects invalid import file', async ({ page }) => {
    // Create an invalid file
    const invalidData = { invalid: 'data' };
    const filePath = '/tmp/test-invalid.json';
    fs.writeFileSync(filePath, JSON.stringify(invalidData));

    await page.goto('/');
    await page.getByRole('button', { name: 'Programs' }).click();
    
    // Set up dialog listener
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Import failed');
      await dialog.accept();
    });
    
    // Try to import the invalid file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for dialog to be handled
    await page.waitForTimeout(500);
    
    // Cleanup
    fs.unlinkSync(filePath);
  });
});
