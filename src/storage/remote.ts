import { getToken } from './auth';
import { refreshAccessToken, isTokenExpired } from './oidc';
import { getApiBaseUrl, getSyncApi } from './runtimeConfig';

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

/**
 * Paths of the two sync APIs. Both take and return the same JSON; PostgREST
 * serves the functions api.sync_push / api.sync_pull of db/migrations.
 */
const SYNC_PATHS = {
  dotnet: { push: '/sync/push', pull: '/sync/pull' },
  postgrest: { push: '/rpc/sync_push', pull: '/rpc/sync_pull' },
} as const;

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  // Refresh token if expired before making the request
  if (isTokenExpired()) {
    await refreshAccessToken();
  }

  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
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
      return fetch(`${getApiBaseUrl()}${path}`, {
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
  const response = await apiFetch(SYNC_PATHS[getSyncApi()].push, {
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
  const response = await apiFetch(`${SYNC_PATHS[getSyncApi()].pull}${params}`);

  if (!response.ok) {
    throw new Error(`Pull failed: ${response.status}`);
  }

  return response.json();
}
