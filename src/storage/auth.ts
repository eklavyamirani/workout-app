const AUTH_MODE_KEY = '__auth_mode';
const AUTH_TOKEN_KEY = '__auth_token';

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
  localStorage.setItem(AUTH_MODE_KEY, 'anonymous');
}

export function getEmailFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email ?? null;
  } catch {
    return null;
  }
}
