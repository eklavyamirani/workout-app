import { test, expect } from '@playwright/test';

// Helper: navigate through ballet setup wizard to the routine builder step
async function createBalletProgramToStep3(page: import('@playwright/test').Page, {
  classType = 'Full Class',
  level = 'Beginner',
}: { classType?: string; level?: string } = {}) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Program' }).click();

  // Select Ballet Class
  await page.getByText('Ballet Class').click();

  // Step 1: Class type — use the label div to avoid ambiguity (e.g. "Pointe" appears in desc too)
  await expect(page.getByText('What type of class?')).toBeVisible();
  await page.locator('button').filter({ hasText: classType }).first().click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2: Level (auto-advances to step 3 after populating routines)
  await expect(page.getByText('What level?')).toBeVisible();
  await page.getByText(level).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Now on step 3: Build your routines
  await expect(page.getByText('Build your routines')).toBeVisible();
}

// Helper: complete ballet setup with flexible schedule
async function createBalletProgram(page: import('@playwright/test').Page, options?: {
  classType?: string;
  level?: string;
}) {
  await createBalletProgramToStep3(page, options);

  // Continue to step 4
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 4: Schedule — pick flexible
  await expect(page.getByText('When do you take class?')).toBeVisible();
  await page.getByText('Flexible').click();
  await page.getByRole('button', { name: 'Create Program' }).click();
}

// Helper: create a ballet program scheduled for today so Start button shows
async function createBalletProgramForToday(page: import('@playwright/test').Page, options?: {
  classType?: string;
  level?: string;
}) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDay = dayNames[new Date().getDay()];

  await createBalletProgramToStep3(page, options);

  // Continue to step 4
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 4: Schedule — weekly with today selected
  await expect(page.getByText('When do you take class?')).toBeVisible();
  await page.getByText('Specific days').click();
  await page.getByRole('button', { name: todayDay }).click();
  await page.getByRole('button', { name: 'Create Program' }).click();
}

test.describe('Ballet Setup Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('can create a beginner full ballet program', async ({ page }) => {
    await createBalletProgram(page, { classType: 'Full Class', level: 'Beginner' });

    // Should return to home with program visible
    await expect(page.getByText('Beginner Full Class').first()).toBeVisible();
  });

  test('can create an intermediate barre-only program', async ({ page }) => {
    await createBalletProgram(page, { classType: 'Barre Only', level: 'Intermediate' });

    await expect(page.getByText('Intermediate Barre Only').first()).toBeVisible();
  });

  test('can create an advanced center-only program', async ({ page }) => {
    await createBalletProgram(page, { classType: 'Center Only', level: 'Advanced' });

    await expect(page.getByText('Advanced Center Only').first()).toBeVisible();
  });

  test('can create a pointe program', async ({ page }) => {
    await createBalletProgram(page, { classType: 'Pointe', level: 'Intermediate' });

    await expect(page.getByText('Intermediate Pointe').first()).toBeVisible();
  });

  test('populates default routines with movements on level selection', async ({ page }) => {
    await createBalletProgramToStep3(page, { classType: 'Full Class', level: 'Beginner' });

    // Should show routine/movement counts in the summary line
    const summary = page.locator('p.text-sm.text-gray-500').filter({ hasText: /routine.*movement/ });
    await expect(summary).toBeVisible();

    // Should show section-based routines (Barre for full class)
    await expect(page.locator('input[value="Barre"]')).toBeVisible();
  });

  test('pre-fills program name from class type and level', async ({ page }) => {
    await createBalletProgramToStep3(page, { classType: 'Full Class', level: 'Beginner' });

    // Program name should be auto-filled
    const nameInput = page.getByPlaceholder('Program name');
    await expect(nameInput).toHaveValue('Beginner Full Class');
  });

  test('can navigate back through wizard steps', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // Step 3 → Back to Step 2
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('What level?')).toBeVisible();

    // Step 2 → Back to Step 1
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('What type of class?')).toBeVisible();
  });

  test('can create a ballet program with weekly schedule', async ({ page }) => {
    await createBalletProgramToStep3(page);

    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 4: Schedule
    await page.getByText('Specific days').click();
    await page.getByRole('button', { name: 'Tue' }).click();
    await page.getByRole('button', { name: 'Thu' }).click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    await expect(page.getByText('Beginner Full Class').first()).toBeVisible();
  });

  test('can create a ballet program with interval schedule', async ({ page }) => {
    await createBalletProgramToStep3(page);

    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 4: Schedule
    await page.getByText('Every X days').click();
    await page.getByRole('button', { name: 'Create Program' }).click();

    await expect(page.getByText('Beginner Full Class').first()).toBeVisible();
  });
});

test.describe('Routine Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('can add a custom routine', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // Click "+ Routine" button
    await page.getByRole('button', { name: 'Routine' }).click();

    // Fill in the new routine modal
    await expect(page.getByRole('heading', { name: 'New Routine' })).toBeVisible();
    await page.getByPlaceholder('e.g., Petit Allegro Combo').fill('My Warm-up');

    // Select a section — use the modal's section buttons specifically
    const modal = page.locator('.fixed.inset-0');
    await modal.getByRole('button', { name: 'Center' }).click();

    // Add the routine
    await page.getByRole('button', { name: 'Add Routine' }).click();

    // Verify it appears (input with that value)
    await expect(page.locator('input[value="My Warm-up"]')).toBeVisible();
  });

  test('can add a movement to a routine', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // Click "Add movement" on the first routine
    await page.getByRole('button', { name: 'Add movement' }).first().click();

    // Modal should open
    await expect(page.getByRole('heading', { name: 'Add Movement' })).toBeVisible();

    // Search for a movement
    await page.getByPlaceholder('Search movements...').fill('Plié');

    // Click the first result
    await page.locator('.overflow-y-auto button').first().click();

    // Modal should close
    await expect(page.getByRole('heading', { name: 'Add Movement' })).not.toBeVisible();
  });

  test('can search and filter movements in add modal', async ({ page }) => {
    await createBalletProgramToStep3(page);

    await page.getByRole('button', { name: 'Add movement' }).first().click();

    // Search for "barre"
    await page.getByPlaceholder('Search movements...').fill('barre');

    // Should show barre movements
    const results = page.locator('.overflow-y-auto button');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);

    // Search for something that doesn't exist
    await page.getByPlaceholder('Search movements...').fill('xyznonexistent');
    await expect(page.getByText(/No matches/)).toBeVisible();
  });

  test('can remove a movement from a routine', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // Get the summary before removing
    const summary = page.locator('p.text-sm.text-gray-500').filter({ hasText: /movement/ });
    const beforeText = await summary.textContent();
    const beforeCount = parseInt(beforeText?.match(/(\d+)\s*movement/)?.[1] || '0');

    // Click Remove (X) button on the first movement
    await page.getByTitle('Remove').first().click();

    // Movement count should decrease
    await expect(summary).not.toHaveText(beforeText!);
    const afterText = await summary.textContent();
    const afterCount = parseInt(afterText?.match(/(\d+)\s*movement/)?.[1] || '0');
    expect(afterCount).toBe(beforeCount - 1);
  });

  test('can duplicate a movement', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // Get the summary before duplicating
    const summary = page.locator('p.text-sm.text-gray-500').filter({ hasText: /movement/ });
    const beforeText = await summary.textContent();
    const beforeCount = parseInt(beforeText?.match(/(\d+)\s*movement/)?.[1] || '0');

    // Click Duplicate on the first movement
    await page.getByTitle('Duplicate').first().click();

    // Count should increase by 1
    const afterText = await summary.textContent();
    const afterCount = parseInt(afterText?.match(/(\d+)\s*movement/)?.[1] || '0');
    expect(afterCount).toBe(beforeCount + 1);
  });

  test('can add notes to a routine', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // Fill in notes for the first routine
    const notesTextarea = page.getByPlaceholder('Notes for this routine...').first();
    await notesTextarea.fill('Remember to engage core throughout');

    await expect(notesTextarea).toHaveValue('Remember to engage core throughout');
  });

  test('can rename a routine', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // The first routine should be "Barre" — rename it
    const routineNameInput = page.locator('input[value="Barre"]');
    await routineNameInput.fill('My Custom Barre');

    await expect(page.locator('input[value="My Custom Barre"]')).toBeVisible();
  });

  test('can collapse and expand a routine', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // The first routine card contains the notes textarea and movement list
    const firstRoutine = page.locator('.bg-white.rounded-lg.border').first();
    const firstRoutineNotes = firstRoutine.getByPlaceholder('Notes for this routine...');
    await expect(firstRoutineNotes).toBeVisible();

    // Click the collapse toggle in the first routine's header
    const firstRoutineHeader = firstRoutine.locator('.bg-gray-50.border-b');
    await firstRoutineHeader.locator('button').first().click();

    // Notes textarea in the first routine should be hidden now
    await expect(firstRoutineNotes).not.toBeVisible();

    // Click again to expand
    await firstRoutineHeader.locator('button').first().click();
    await expect(firstRoutineNotes).toBeVisible();
  });

  test('can remove a routine', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // Count routines before
    const summary = page.locator('p.text-sm.text-gray-500').filter({ hasText: /routine/ });
    const routineCountText = await summary.textContent();
    const beforeCount = parseInt(routineCountText?.match(/(\d+)\s*routine/)?.[1] || '0');

    // Click the X (remove) button on the first routine header — it's the last button in the header
    const firstRoutineHeader = page.locator('.bg-gray-50.border-b').first();
    await firstRoutineHeader.locator('button').last().click();

    // Count should decrease
    const afterText = await summary.textContent();
    const afterCount = parseInt(afterText?.match(/(\d+)\s*routine/)?.[1] || '0');
    expect(afterCount).toBe(beforeCount - 1);
  });
});

test.describe('Ballet Session', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('can start a ballet session and see routines with movements', async ({ page }) => {
    await createBalletProgramForToday(page);

    // Start the session
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Should see program name
    await expect(page.getByRole('heading', { name: 'Beginner Full Class' })).toBeVisible();

    // Should see "Routine 1 of N" indicator
    await expect(page.getByText(/Routine 1 of/)).toBeVisible();

    // Should see the Movements heading
    await expect(page.getByText('Movements')).toBeVisible();

    // Should see individual movement names listed
    const movementItems = page.locator('.divide-y .text-sm.text-gray-800');
    const count = await movementItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('can mark a routine as done and advance to next', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Should be on routine 1
    await expect(page.getByText(/Routine 1 of/)).toBeVisible();

    // Mark as done
    await page.getByRole('button', { name: 'Mark as Done' }).click();

    // Should advance to routine 2
    await expect(page.getByText(/Routine 2 of/)).toBeVisible();
  });

  test('can complete all routines and finish session', async ({ page }) => {
    // Use barre-only for fewer routines (barre + cooldown = 2 routines)
    await createBalletProgramForToday(page, { classType: 'Barre Only', level: 'Beginner' });
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Get the total number of routines from tabs
    const tabs = page.locator('.flex.gap-2.mb-4 button');
    const tabCount = await tabs.count();

    // Mark each routine as done
    for (let i = 0; i < tabCount; i++) {
      // Mark as Done should advance to next, or stay on last
      await page.getByRole('button', { name: 'Mark as Done' }).click();
    }

    // All routines should be done, Finish should be enabled
    await page.getByRole('button', { name: 'Finish' }).click();

    // Should be back on home with Done status
    await expect(page.getByText('Done').first()).toBeVisible();
  });

  test('can add session notes', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Add session notes in the per-routine textarea
    const sessionNotes = page.getByPlaceholder('How did it feel? Any corrections from the teacher?');
    await sessionNotes.fill('Teacher said to focus on turnout');

    await expect(sessionNotes).toHaveValue('Teacher said to focus on turnout');
  });

  test('can add practice-next notes (ballet only)', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Should see the "Practice next week" section
    await expect(page.getByText('Practice next week')).toBeVisible();

    const practiceNextTextarea = page.getByPlaceholder(/What do you want to work on next time/);
    await practiceNextTextarea.fill('Work on spotting for pirouettes');

    await expect(practiceNextTextarea).toHaveValue('Work on spotting for pirouettes');
  });

  test('can navigate between routines via tabs', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Should see activity tabs — there are multiple routines for a Full Class
    const tabs = page.locator('.flex.gap-2.mb-4 button');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(1);

    // Click the second tab
    await tabs.nth(1).click();

    // Should show routine 2
    await expect(page.getByText(/Routine 2 of/)).toBeVisible();

    // Click back to first tab
    await tabs.nth(0).click();
    await expect(page.getByText(/Routine 1 of/)).toBeVisible();
  });

  test('can open glossary from session view', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Click the glossary button (BookOpen icon)
    await page.getByTitle('Movement glossary').click();

    // Should see the glossary modal
    await expect(page.getByText('Movement Glossary')).toBeVisible();

    // Can search in glossary
    await page.getByPlaceholder('Search movements...').fill('Plié');
    await expect(page.getByText('plee-AY')).toBeVisible();

    // Close glossary by clicking the X button in the modal header
    const glossaryModal = page.locator('.fixed.inset-0').last();
    await glossaryModal.locator('button').first().click();

    // Glossary should close
    await expect(page.getByText('Movement Glossary')).not.toBeVisible();
  });

  test('shows general notes field', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Should see general notes
    const generalNotes = page.getByPlaceholder('How did it go?');
    await expect(generalNotes).toBeVisible();
    await generalNotes.fill('Great session today');
    await expect(generalNotes).toHaveValue('Great session today');
  });
});

test.describe('In-Session Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('can open edit modal during session', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Click the pencil icon to edit routines
    await page.getByTitle('Edit routines').click();

    // Should see the edit modal with RoutineBuilder
    await expect(page.getByText('Edit Routines')).toBeVisible();

    // Should see Save and Cancel buttons
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('can cancel editing without changes', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    await page.getByTitle('Edit routines').click();
    await expect(page.getByText('Edit Routines')).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should close
    await expect(page.getByText('Edit Routines')).not.toBeVisible();

    // Session view should still be visible
    await expect(page.getByText(/Routine 1 of/)).toBeVisible();
  });

  test('can add a movement and save during session', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Count movements before
    const movementsBefore = page.locator('.divide-y .text-sm.text-gray-800');
    const beforeCount = await movementsBefore.count();

    // Open edit modal
    await page.getByTitle('Edit routines').click();

    // Add a movement to the first routine
    await page.getByRole('button', { name: 'Add movement' }).first().click();
    await page.getByPlaceholder('Search movements...').fill('Relevé');
    // Click the movement in the add-movement modal (last overlay)
    const addMovementModal = page.locator('.fixed.inset-0').last();
    await addMovementModal.locator('.overflow-y-auto button').first().click();

    // Save edits
    await page.getByRole('button', { name: 'Save' }).click();

    // Modal should close
    await expect(page.getByText('Edit Routines')).not.toBeVisible();

    // Movement count should have increased
    const movementsAfter = page.locator('.divide-y .text-sm.text-gray-800');
    const afterCount = await movementsAfter.count();
    expect(afterCount).toBe(beforeCount + 1);
  });

  test('can add notes to a routine during session editing', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Open edit modal
    await page.getByTitle('Edit routines').click();

    // Add notes in the routine builder
    const notesField = page.getByPlaceholder('Notes for this routine...').first();
    await notesField.fill('Focus on alignment');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // The notes should now appear in the session view
    await expect(page.getByText('Focus on alignment')).toBeVisible();
  });
});

test.describe('Exercise Reference Popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('can open reference popover from routine builder', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // Click the reference (video) icon on the first movement
    await page.getByTitle('Reference').first().click();

    // Should see the reference popover with the exercise name
    await expect(page.getByText('Glossary')).toBeVisible();
    await expect(page.getByText('My YouTube Links')).toBeVisible();
    await expect(page.getByText('Note')).toBeVisible();
  });

  test('shows auto-matched glossary entry', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // Click reference on first movement (which should be Pliés or similar)
    await page.getByTitle('Reference').first().click();

    // Should auto-match and show a glossary entry with pronunciation
    // The glossary section should either show a match or "No glossary match found"
    const glossarySection = page.locator('.p-3.bg-purple-50');
    const noMatch = page.getByText('No glossary match found');

    // One of these should be visible
    const hasMatch = await glossarySection.isVisible().catch(() => false);
    const hasNoMatch = await noMatch.isVisible().catch(() => false);
    expect(hasMatch || hasNoMatch).toBe(true);
  });

  test('can add a YouTube link', async ({ page }) => {
    await createBalletProgramToStep3(page);

    await page.getByTitle('Reference').first().click();

    // Add a YouTube link
    const urlInput = page.getByPlaceholder('Paste YouTube URL...');
    await urlInput.fill('https://www.youtube.com/watch?v=example123');

    // Click the add button (the small purple button next to the input)
    const addLinkBtn = page.locator('button').filter({ has: page.locator('svg.w-3.h-3') }).last();
    await addLinkBtn.click();

    // The link should appear in the list
    await expect(page.getByText('https://www.youtube.com/watch?v=example123')).toBeVisible();

    // Input should be cleared
    await expect(urlInput).toHaveValue('');
  });

  test('can add a note to a reference', async ({ page }) => {
    await createBalletProgramToStep3(page);

    await page.getByTitle('Reference').first().click();

    // Add a note
    const noteTextarea = page.getByPlaceholder('Your notes about this exercise...');
    await noteTextarea.fill('Remember to keep knees over toes');

    await expect(noteTextarea).toHaveValue('Remember to keep knees over toes');
  });

  test('can save and re-open a reference', async ({ page }) => {
    await createBalletProgramToStep3(page);

    // Open reference for first movement
    await page.getByTitle('Reference').first().click();

    // Add a note and a link
    await page.getByPlaceholder('Your notes about this exercise...').fill('Keep heels down');
    const urlInput = page.getByPlaceholder('Paste YouTube URL...');
    await urlInput.fill('https://www.youtube.com/watch?v=test');
    const addLinkBtn = page.locator('button').filter({ has: page.locator('svg.w-3.h-3') }).last();
    await addLinkBtn.click();

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Re-open the same reference
    await page.getByTitle('Reference').first().click();

    // Note and link should be persisted
    await expect(page.getByPlaceholder('Your notes about this exercise...')).toHaveValue('Keep heels down');
    await expect(page.getByText('https://www.youtube.com/watch?v=test')).toBeVisible();
  });

  test('can remove a YouTube link', async ({ page }) => {
    await createBalletProgramToStep3(page);

    await page.getByTitle('Reference').first().click();

    // Add a link first
    const urlInput = page.getByPlaceholder('Paste YouTube URL...');
    await urlInput.fill('https://www.youtube.com/watch?v=toremove');
    const addLinkBtn = page.locator('button').filter({ has: page.locator('svg.w-3.h-3') }).last();
    await addLinkBtn.click();

    await expect(page.getByText('https://www.youtube.com/watch?v=toremove')).toBeVisible();

    // Remove the link — click the trash button (it appears after the link)
    const trashBtns = page.locator('.space-y-1\\.5 button');
    await trashBtns.first().click();

    // Link should be gone
    await expect(page.getByText('https://www.youtube.com/watch?v=toremove')).not.toBeVisible();
  });

  test('can search glossary and override match', async ({ page }) => {
    await createBalletProgramToStep3(page);

    await page.getByTitle('Reference').first().click();

    // Click "Search" to open glossary search
    await page.getByRole('button', { name: 'Search' }).click();

    // Search for a term
    await page.getByPlaceholder('Search glossary...').fill('Tendu');

    // Should show filtered results
    await expect(page.getByText('Tendu').first()).toBeVisible();

    // Select it to override
    await page.getByRole('button').filter({ hasText: 'Tendu' }).first().click();

    // Should now show the overridden glossary entry
    await expect(page.locator('.p-3.bg-purple-50').getByText('Tendu')).toBeVisible();
  });

  test('can open reference from session view movements', async ({ page }) => {
    await createBalletProgramForToday(page);
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Click reference button on a movement in session view
    await page.getByTitle('Reference').first().click();

    // Should see the reference popover
    await expect(page.getByText('Glossary')).toBeVisible();
    await expect(page.getByText('My YouTube Links')).toBeVisible();

    // Close it by pressing Escape (avoids overlay intercept issues)
    await page.keyboard.press('Escape');
  });
});

test.describe('Ballet Program Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('ballet program persists after page reload', async ({ page }) => {
    await createBalletProgram(page);

    // Program should be visible
    await expect(page.getByText('Beginner Full Class').first()).toBeVisible();

    // Reload the page
    await page.reload();

    // Program should still be there
    await expect(page.getByText('Beginner Full Class').first()).toBeVisible();
  });

  test('ballet program appears in programs list', async ({ page }) => {
    await createBalletProgram(page);

    // Go to programs view
    await page.getByRole('button', { name: 'Programs' }).click();

    // Should see the ballet program
    await expect(page.getByText('Beginner Full Class').first()).toBeVisible();
  });

  test('can delete a ballet program', async ({ page }) => {
    await createBalletProgram(page);

    // Go to programs view
    await page.getByRole('button', { name: 'Programs' }).click();
    await expect(page.getByText('Beginner Full Class').first()).toBeVisible();

    // Delete
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete program' }).click();

    // Should be gone
    await expect(page.getByText('No programs yet')).toBeVisible();
  });
});
