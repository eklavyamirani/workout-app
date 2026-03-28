import { test as base, Page } from '@playwright/test';

/**
 * Playwright fixture that provides an authenticated page.
 * Injects a JWT directly into localStorage, bypassing the Authentik UI.
 *
 * For tests that don't need a real backend, use `mockAuthenticatedPage`
 * which injects a fake JWT token.
 *
 * For tests that need real API access, use `authenticatedPage`
 * which obtains a real JWT from Authentik via the API.
 */

// Fake JWT for tests that don't need real API access
function createFakeJwt(email: string): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'test-user-id',
    email,
    iss: 'http://localhost/application/o/workout-app/',
    aud: 'workout-app',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
  }));
  const signature = btoa('fake-signature');
  return `${header}.${payload}.${signature}`;
}

export const test = base.extend<{
  mockAuthenticatedPage: Page;
  authenticatedPage: Page;
}>({
  // Page with a fake JWT (no real API access)
  mockAuthenticatedPage: async ({ page }, use) => {
    const token = createFakeJwt('test@example.com');
    await page.goto('/');
    await page.evaluate(({ t }) => {
      localStorage.setItem('__auth_token', t);
      localStorage.setItem('__auth_mode', 'authenticated');
    }, { t: token });
    await page.reload();
    await use(page);
  },

  // Page with a real JWT from Authentik (requires docker-compose)
  authenticatedPage: async ({ page }, use) => {
    const token = await getAuthentikToken();
    if (!token) {
      throw new Error(
        'Could not obtain Authentik token. Is docker-compose running?\n' +
        'Run: docker compose -f deploy/docker-compose.yml up -d && bash scripts/setup-authentik.sh'
      );
    }
    await page.goto('/');
    await page.evaluate(({ t }) => {
      localStorage.setItem('__auth_token', t);
      localStorage.setItem('__auth_mode', 'authenticated');
    }, { t: token });
    await page.reload();
    await use(page);
  },
});

async function getAuthentikToken(): Promise<string | null> {
  const authentikUrl = process.env.AUTHENTIK_URL || 'http://localhost';
  const adminToken = process.env.AUTHENTIK_TOKEN || 'test-admin-token';

  try {
    // Create a test user if it doesn't exist
    const email = 'e2e-test@example.com';
    const password = 'e2e-test-password-123!';
    const username = 'e2e-test';

    // Try to create user via Authentik admin API
    await fetch(`${authentikUrl}/api/v3/core/users/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        name: 'E2E Test User',
        email,
        is_active: true,
        path: 'users',
      }),
    });

    // Set the user's password
    const usersResponse = await fetch(
      `${authentikUrl}/api/v3/core/users/?search=${username}`,
      { headers: { 'Authorization': `Bearer ${adminToken}` } }
    );
    const users = await usersResponse.json();
    const userId = users.results?.[0]?.pk;

    if (userId) {
      await fetch(`${authentikUrl}/api/v3/core/users/${userId}/set_password/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
    }

    // Get a token via resource-owner password grant
    const tokenResponse = await fetch(
      `${authentikUrl}/application/o/token/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'workout-app',
          username,
          password,
          scope: 'openid email profile',
        }),
      }
    );

    if (!tokenResponse.ok) {
      console.error('Token request failed:', await tokenResponse.text());
      return null;
    }

    const tokens = await tokenResponse.json();
    return tokens.access_token || null;
  } catch (error) {
    console.error('Failed to get Authentik token:', error);
    return null;
  }
}

export { test as expect } from '@playwright/test';
