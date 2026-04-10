import { setAuthToken, clearAuth, getToken } from './auth';

// OIDC configuration from Vite env vars
function getConfig() {
  const authority = import.meta.env.VITE_OIDC_AUTHORITY as string | undefined;
  const clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;
  const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI as string | undefined;
  return { authority, clientId, redirectUri };
}

// Cache for OIDC discovery document endpoints
let discoveryCache: {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
} | null = null;

async function getDiscoveryEndpoints() {
  if (discoveryCache) return discoveryCache;
  const { authority } = getConfig();
  if (!authority) throw new Error('OIDC authority not configured');
  const resp = await fetch(`${authority}/.well-known/openid-configuration`);
  if (!resp.ok) throw new Error(`OIDC discovery failed: ${resp.status}`);
  const doc = await resp.json();
  discoveryCache = {
    authorization_endpoint: doc.authorization_endpoint,
    token_endpoint: doc.token_endpoint,
    end_session_endpoint: doc.end_session_endpoint,
  };
  return discoveryCache;
}

export function isOidcConfigured(): boolean {
  const { authority, clientId, redirectUri } = getConfig();
  return Boolean(authority && clientId && redirectUri);
}

// --- PKCE helpers ---

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateRandom(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

// --- OIDC flow ---

export async function login(): Promise<void> {
  const { clientId, redirectUri } = getConfig();
  if (!clientId || !redirectUri) {
    throw new Error('OIDC not configured');
  }

  const { authorization_endpoint } = await getDiscoveryEndpoints();

  const codeVerifier = generateRandom(32);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandom(16);
  const nonce = generateRandom(16);

  // Store in sessionStorage (per-tab, transient)
  sessionStorage.setItem('oidc_code_verifier', codeVerifier);
  sessionStorage.setItem('oidc_state', state);
  sessionStorage.setItem('oidc_nonce', nonce);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  // After an explicit logout, force re-authentication so the IdP doesn't
  // silently reuse the previous session.
  if (sessionStorage.getItem('oidc_force_login')) {
    params.set('prompt', 'login');
    sessionStorage.removeItem('oidc_force_login');
  }

  window.location.href = `${authorization_endpoint}?${params.toString()}`;
}

export async function handleCallback(code: string, state: string): Promise<void> {
  const { clientId, redirectUri } = getConfig();
  if (!clientId || !redirectUri) {
    throw new Error('OIDC not configured');
  }

  // Validate state
  const savedState = sessionStorage.getItem('oidc_state');
  if (state !== savedState) {
    throw new Error('Invalid OIDC state parameter');
  }

  const codeVerifier = sessionStorage.getItem('oidc_code_verifier');
  if (!codeVerifier) {
    throw new Error('Missing OIDC code verifier');
  }

  const { token_endpoint } = await getDiscoveryEndpoints();

  // Exchange code for tokens
  const response = await fetch(token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const tokens = await response.json();
  const accessToken = tokens.access_token;
  if (!accessToken) {
    throw new Error('No access_token in token response');
  }

  // Store the access token (sets auth mode to authenticated)
  setAuthToken(accessToken);

  // Store refresh token if provided
  if (tokens.refresh_token) {
    localStorage.setItem('__auth_refresh_token', tokens.refresh_token);
  }

  // Clean up transient OIDC state
  sessionStorage.removeItem('oidc_code_verifier');
  sessionStorage.removeItem('oidc_state');
  sessionStorage.removeItem('oidc_nonce');

  // Clean up URL
  window.history.replaceState({}, '', window.location.pathname);
}

export async function refreshAccessToken(): Promise<string | null> {
  const { clientId } = getConfig();
  if (!clientId) return null;

  const refreshToken = localStorage.getItem('__auth_refresh_token');
  if (!refreshToken) return null;

  try {
    const { token_endpoint } = await getDiscoveryEndpoints();
    const response = await fetch(token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      localStorage.removeItem('__auth_refresh_token');
      return null;
    }

    const tokens = await response.json();
    if (tokens.access_token) {
      setAuthToken(tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem('__auth_refresh_token', tokens.refresh_token);
      }
      return tokens.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem('__auth_refresh_token');
  clearAuth();
  // Signal the next login() call to force re-authentication
  sessionStorage.setItem('oidc_force_login', '1');
  window.location.reload();
}

export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    return true;
  }
}
