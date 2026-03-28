import { getToken } from './auth';
import { refreshAccessToken, isTokenExpired } from './oidc';

export interface SyncChange {
  key: string;
  value: unknown;
  updatedAt: string;
  version: number;
  deleted: boolean;
}

export interface PushResultItem {
  key: string;
  status: 'ok' | 'conflict' | 'error';
  version: number;
  value?: unknown;
}

export interface PushResponse {
  results: PushResultItem[];
  serverTime: string;
}

export interface PullResponse {
  changes: SyncChange[];
  serverTime: string;
}

const API_BASE = '/api';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  // Refresh token if expired before making the request
  if (isTokenExpired()) {
    await refreshAccessToken();
  }

  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  // If 401, try refreshing token once and retry
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
          ...options.headers,
        },
      });
    }
  }

  return response;
}

export async function pushChanges(changes: SyncChange[]): Promise<PushResponse> {
  const response = await apiFetch('/sync/push', {
    method: 'POST',
    body: JSON.stringify({ changes }),
  });

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status}`);
  }

  return response.json();
}

export async function pullChanges(since?: string): Promise<PullResponse> {
  const params = since ? `?since=${encodeURIComponent(since)}` : '?since=2000-01-01T00:00:00Z';
  const response = await apiFetch(`/sync/pull${params}`);

  if (!response.ok) {
    throw new Error(`Pull failed: ${response.status}`);
  }

  return response.json();
}
