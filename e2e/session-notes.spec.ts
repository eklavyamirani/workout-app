import { test, expect, Page } from '@playwright/test';
import { enterAnonymousMode } from './helpers';

/**
 * Regression tests for the in-session issues:
 * - #32 logging a set while signed in must not bounce back to the home page
 * - #33 notes are saved while the session is in progress
 * - #34 notes per exercise as well as per session; a large, resizable session notes box
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function createWeightliftingProgram(page: Page, name: string, exercises: string[]) {
  await page.getByRole('button', { name: 'Create Program' }).click();
  await page.getByText('Weightlifting').first().click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder(/Strength Training/).fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Specific days').click();
  await page.getByRole('button', { name: DAY_NAMES[new Date().getDay()] }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  for (const exercise of exercises) {
    await page.getByPlaceholder('Exercise name').fill(exercise);
    await page.getByRole('button', { name: 'Add Exercise' }).click();
  }
  await page.getByRole('button', { name: 'Create Program' }).click();
}

async function logSet(page: Page, weight: string, reps: string) {
  await page.locator('input[type="number"]').first().fill(weight);
  await page.locator('input[type="number"]').nth(1).fill(reps);
  await page.getByRole('button', { name: /Log Set \(/ }).click();
}

async function storedSession(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('sessions:'));
    return key ? JSON.parse(localStorage.getItem(key)!) : null;
  });
}

function fakeJwt(): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'test-user',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  }));
  return `${header}.${payload}.${btoa('sig')}`;
}

test.describe('Session notes and sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('logging a set while signed in stays in the session (#32)', async ({ page }) => {
    // Fake server: push accepts everything; pull echoes the pushed keys back (as the real
    // server does for the pushing device) plus a change from another device.
    const versions = new Map<string, number>();
    const pushed: { key: string; value: unknown; version: number }[] = [];
    await page.route('**/api/sync/push', async route => {
      const { changes } = route.request().postDataJSON();
      const results = changes.map((c: { key: string; value: unknown }) => {
        const version = (versions.get(c.key) ?? 0) + 1;
        versions.set(c.key, version);
        pushed.push({ key: c.key, value: c.value, version });
        return { key: c.key, status: 'ok', version };
      });
      await route.fulfill({ json: { results, serverTime: new Date().toISOString() } });
    });
    await page.route('**/api/sync/pull**', route =>
      route.fulfill({
        json: {
          changes: [
            ...pushed.map(p => ({ ...p, updatedAt: new Date().toISOString(), deleted: false })),
            ...(pushed.length > 0
              ? [{ key: 'references:squat', value: { exerciseId: 'squat', youtubeLinks: [], updatedAt: '2026-01-01T00:00:00Z' }, version: 1, updatedAt: new Date().toISOString(), deleted: false }]
              : []),
          ],
          serverTime: new Date().toISOString(),
        },
      }),
    );

    const token = fakeJwt();
    await page.evaluate(({ token }) => {
      localStorage.setItem('__auth_token', token);
      localStorage.setItem('__auth_id_token', token);
      localStorage.setItem('__auth_mode', 'authenticated');
    }, { token });
    await page.reload();

    await createWeightliftingProgram(page, 'Push Day', ['Bench Press']);
    await page.getByRole('button', { name: 'Start' }).first().click();
    await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible();

    await logSet(page, '135', '10');
    await expect(page.getByText('Set 1')).toBeVisible();

    // Push fires after a 2s debounce and is followed by a pull
    await expect.poll(() => pushed.some(p => p.key.startsWith('sessions:')), { timeout: 10000 }).toBe(true);
    await page.waitForTimeout(1000);

    await expect(page.getByRole('heading', { name: 'Bench Press' })).toBeVisible();
    await logSet(page, '135', '8');
    await expect(page.getByText('Set 2')).toBeVisible();
  });

  test('notes are saved per exercise and per session while in progress (#33, #34)', async ({ page }) => {
    await enterAnonymousMode(page);
    await createWeightliftingProgram(page, 'Pull Day', ['Barbell Row', 'Curl']);
    await page.getByRole('button', { name: 'Start' }).first().click();

    await page.getByLabel('Exercise notes').fill('Elbows tucked');
    await page.getByRole('button', { name: 'Curl', exact: true }).click();
    await expect(page.getByLabel('Exercise notes')).toHaveValue('');
    await page.getByLabel('Exercise notes').fill('Left arm weaker');
    await page.getByLabel('Session notes').fill('Slept badly');

    // Saved without finishing the session
    await expect.poll(async () => {
      const session = await storedSession(page);
      return {
        notes: session?.notes,
        activityNotes: session?.activities.map((a: { notes?: string }) => a.notes).sort(),
      };
    }).toEqual({ notes: 'Slept badly', activityNotes: ['Elbows tucked', 'Left arm weaker'] });

    // Leave and come back: notes are still there
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: /Start|Continue|Resume/ }).first().click();
    await expect(page.getByLabel('Exercise notes')).toHaveValue('Elbows tucked');
    await expect(page.getByLabel('Session notes')).toHaveValue('Slept badly');

    // Notes survive logging a set and finishing
    await logSet(page, '95', '8');
    await page.getByRole('button', { name: 'Curl', exact: true }).click();
    await logSet(page, '25', '12');
    await page.getByRole('button', { name: 'Finish' }).click();
    const session = await storedSession(page);
    expect(session.status).toBe('completed');
    expect(session.notes).toBe('Slept badly');
    expect(session.activities.map((a: { notes?: string }) => a.notes).sort()).toEqual(['Elbows tucked', 'Left arm weaker']);
  });

  test('session notes box is large and resizable (#34)', async ({ page }) => {
    await enterAnonymousMode(page);
    await createWeightliftingProgram(page, 'Leg Day', ['Squat']);
    await page.getByRole('button', { name: 'Start' }).first().click();

    const box = page.getByLabel('Session notes');
    const { height, viewport, resize } = await box.evaluate(el => ({
      height: el.getBoundingClientRect().height,
      viewport: window.innerHeight,
      resize: getComputedStyle(el).resize,
    }));
    expect(height).toBeGreaterThanOrEqual(viewport * 0.45);
    expect(resize).toBe('vertical');
  });
});
