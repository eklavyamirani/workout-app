const AUTH_MODE_KEY = '__auth_mode';
const AUTH_TOKEN_KEY = '__auth_token';
const ID_TOKEN_KEY = '__auth_id_token';

export type AuthMode = 'anonymous' | 'authenticated';

export function getAuthMode(): AuthMode | null {
  return localStorage.getItem(AUTH_MODE_KEY) as AuthMode | null;
}

export function isAuthenticated(): boolean {
  return getAuthMode() === 'authenticated' && getToken() !== null;
}

export function isAnonymous(): boolean {
  return getAuthMode() === 'anonymous';
}

export function enterAnonymousMode(): void {
  localStorage.setItem(AUTH_MODE_KEY, 'anonymous');
}

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_MODE_KEY, 'authenticated');
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.setItem(AUTH_MODE_KEY, 'anonymous');
}

/**
 * The ID token is kept for display claims and as the logout `id_token_hint`. Pocket ID's
 * access tokens carry no email claim; its ID tokens do.
 */
export function setIdToken(token: string): void {
  localStorage.setItem(ID_TOKEN_KEY, token);
}

export function getIdToken(): string | null {
  return localStorage.getItem(ID_TOKEN_KEY);
}

function emailFrom(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.email ?? null;
  } catch {
    return null;
  }
}

export function getEmailFromToken(): string | null {
  return emailFrom(getIdToken()) ?? emailFrom(getToken());
}
