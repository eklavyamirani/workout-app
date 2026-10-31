import { test, expect } from '@playwright/test';

/**
 * Tests for OIDC sign-in / sign-out bugfixes:
 *
 * 1. Sign-in uses the OIDC discovery document's authorization_endpoint
 *    (not a manually constructed URL from the authority).
 * 2. Sign-out goes through the discovery end_session_endpoint (RP-initiated
 *    logout) with client_id, post_logout_redirect_uri and id_token_hint, so the
 *    IdP session ends and the user returns to the app (Authentik or Pocket ID).
 */

// Fake OIDC discovery document matching what Authentik would return
const FAKE_DISCOVERY = {
  issuer: 'http://localhost/application/o/workout-app/',
  authorization_endpoint: 'http://localhost/application/o/authorize/',
  token_endpoint: 'http://localhost/application/o/token/',
  end_session_endpoint: 'http://localhost/application/o/workout-app/end-session/',
};

function fakeJwt(): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'test-user',
    email: 'test@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  }));
  return `${header}.${payload}.${btoa('sig')}`;
}

test.describe('OIDC sign-in', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('sign-in redirects to the discovery authorization_endpoint, not a constructed URL', async ({ page }) => {
    // Mock the OIDC discovery endpoint
    await page.route('**/application/o/workout-app/.well-known/openid-configuration', route =>
      route.fulfill({ json: FAKE_DISCOVERY }),
    );

    // Intercept the authorize redirect so the browser stays on the page
    let authorizeUrl: string | null = null;
    await page.route('**/application/o/authorize/**', route => {
      authorizeUrl = route.request().url();
      // Return a simple page so the browser doesn't navigate away
      route.fulfill({ status: 200, body: 'intercepted' });
    });

    // Click sign-in
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(2000);

    // The authorize URL should start with the discovery endpoint,
    // NOT with ${authority}/authorize/ (which would be /application/o/workout-app/authorize/)
    expect(authorizeUrl).not.toBeNull();
    const url = new URL(authorizeUrl!);
    expect(url.pathname).toBe('/application/o/authorize/');
    // Must NOT contain the app slug in the authorize path
    expect(url.pathname).not.toContain('/workout-app/authorize');

    // Standard OIDC params should be present
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('workout-app');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('state')).toBeTruthy();
  });

  test('normalizes a trailing slash before requesting OIDC discovery', async ({ page }) => {
    await page.route('**/runtime-config.json', route =>
      route.fulfill({
        json: {
          oidcAuthority: 'http://localhost/application/o/workout-app/',
          oidcClientId: 'workout-app',
          oidcRedirectUri: 'http://localhost:4173/',
        },
      }),
    );

    let discoveryUrl: string | null = null;
    await page.route('**/.well-known/openid-configuration', route => {
      discoveryUrl = route.request().url();
      return route.fulfill({ json: FAKE_DISCOVERY });
    });
    await page.route('**/application/o/authorize/**', route =>
      route.fulfill({ status: 200, body: 'intercepted' }),
    );

    await page.reload();
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(1000);

    expect(discoveryUrl).toBe(
      'http://localhost/application/o/workout-app/.well-known/openid-configuration',
    );
  });

  test('OIDC callback exchanges code using discovery token_endpoint', async ({ page }) => {
    // Mock discovery
    await page.route('**/application/o/workout-app/.well-known/openid-configuration', route =>
      route.fulfill({ json: FAKE_DISCOVERY }),
    );

    // Track token exchange requests
    let tokenRequestUrl: string | null = null;
    let tokenRequestBody: string | null = null;
    await page.route('**/application/o/token/', route => {
      tokenRequestUrl = route.request().url();
      tokenRequestBody = route.request().postData();
      route.fulfill({
        json: {
          access_token: fakeJwt(),
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh',
          id_token: fakeJwt(),
        },
      });
    });

    // Suppress sync calls that happen after authentication
    await page.route('**/api/sync/**', route =>
      route.fulfill({ status: 200, json: { changes: [] } }),
    );

    // Simulate arriving back from the IdP with a code
    // First set up the OIDC state that login() would have stored
    await page.evaluate(() => {
      sessionStorage.setItem('oidc_code_verifier', 'test-verifier');
      sessionStorage.setItem('oidc_state', 'test-state');
      sessionStorage.setItem('oidc_nonce', 'test-nonce');
    });

    // Navigate with code and state params (simulates IdP redirect back)
    await page.goto('/?code=test-auth-code&state=test-state');
    await page.waitForTimeout(2000);

    // Token exchange should hit the discovery token_endpoint, not ${authority}/token/
    expect(tokenRequestUrl).not.toBeNull();
    expect(new URL(tokenRequestUrl!).pathname).toBe('/application/o/token/');
    // NOT /application/o/workout-app/token/
    expect(new URL(tokenRequestUrl!).pathname).not.toContain('/workout-app/token');

    // Verify the code was sent
    expect(tokenRequestBody).toContain('code=test-auth-code');
    expect(tokenRequestBody).toContain('grant_type=authorization_code');

    // User should be authenticated
    const authMode = await page.evaluate(() => localStorage.getItem('__auth_mode'));
    expect(authMode).toBe('authenticated');
  });
});

test.describe('OIDC sign-out', () => {
  const isEndSession = (url: URL) => url.pathname === '/application/o/workout-app/end-session/';

  async function signInWithFakeTokens(page: import('@playwright/test').Page): Promise<string> {
    const token = fakeJwt();
    await page.route('**/application/o/workout-app/.well-known/openid-configuration', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_DISCOVERY) }),
    );
    await page.goto('/');
    await page.evaluate(({ token }) => {
      localStorage.setItem('__auth_token', token);
      localStorage.setItem('__auth_id_token', token);
      localStorage.setItem('__auth_mode', 'authenticated');
      localStorage.setItem('__auth_refresh_token', 'fake-refresh');
    }, { token });
    await page.reload();
    await expect(page.getByTitle('Sign out')).toBeVisible({ timeout: 5000 });
    return token;
  }

  test('sign-out goes through the discovery end_session_endpoint with a return URL', async ({ page }) => {
    const idToken = await signInWithFakeTokens(page);

    let endSessionUrl: URL | null = null;
    await page.route(isEndSession, route => {
      endSessionUrl = new URL(route.request().url());
      // Redirect back to the app as the IdP would. WebKit refuses route.fulfill() with a
      // 3xx status, so emulate the redirect with HTML.
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><head><meta http-equiv="refresh" content="0; url=/"></head><body></body></html>',
      });
    });

    await page.getByTitle('Sign out').click();
    await expect.poll(() => endSessionUrl).not.toBeNull();

    const params = endSessionUrl!.searchParams;
    expect(params.get('client_id')).toBe('workout-app');
    expect(params.get('post_logout_redirect_uri')).toBe('http://localhost:5173/');
    // Pocket ID only redirects back when given the ID token as a hint.
    expect(params.get('id_token_hint')).toBe(idToken);
  });

  test('sign-out clears local auth state before navigating to IdP', async ({ page }) => {
    await signInWithFakeTokens(page);

    const baseUrl = page.url().replace(/\/$/, '');
    await page.route(isEndSession, route =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<html><head><meta http-equiv="refresh" content="0; url=${baseUrl}/"></head><body></body></html>`,
      }),
    );

    await page.getByTitle('Sign out').click();

    // After the IdP redirects back, the auth gate should appear
    // (because clearAuth() set __auth_mode to 'anonymous' and removed the tokens)
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTitle('Sign out')).not.toBeVisible();

    const authState = await page.evaluate(() => ({
      authMode: localStorage.getItem('__auth_mode'),
      token: localStorage.getItem('__auth_token'),
      idToken: localStorage.getItem('__auth_id_token'),
      refresh: localStorage.getItem('__auth_refresh_token'),
    }));
    expect(authState.authMode).toBe('anonymous');
    expect(authState.token).toBeNull();
    expect(authState.idToken).toBeNull();
    expect(authState.refresh).toBeNull();
  });

  test('sign-out without a reachable IdP still signs out locally', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(({ token }) => {
      localStorage.setItem('__auth_token', token);
      localStorage.setItem('__auth_mode', 'authenticated');
    }, { token: fakeJwt() });
    await page.route('**/.well-known/openid-configuration', route => route.fulfill({ status: 503 }));
    await page.reload();

    await expect(page.getByTitle('Sign out')).toBeVisible({ timeout: 5000 });
    await page.getByTitle('Sign out').click();

    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 10000 });
    const token = await page.evaluate(() => localStorage.getItem('__auth_token'));
    expect(token).toBeNull();
  });
});
