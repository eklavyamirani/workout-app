import { isAuthenticated } from './auth';
import { localGet, localSet, localDelete, localList } from './local';
import { pushChanges, pullChanges, SyncChange } from './remote';

// --- Meta tracking ---

interface KeyMeta {
  version: number;
  dirty: boolean;
  updatedAt: string;
  deleted?: boolean;
}

function getMeta(key: string): KeyMeta | null {
  return localGet<KeyMeta>(`__meta:${key}`);
}

function setMeta(key: string, meta: KeyMeta): void {
  localSet(`__meta:${key}`, meta);
}

function removeMeta(key: string): void {
  localDelete(`__meta:${key}`);
}

export function markDirty(key: string, deleted = false): void {
  const existing = getMeta(key);
  setMeta(key, {
    version: existing?.version ?? 0,
    dirty: true,
    updatedAt: new Date().toISOString(),
    deleted,
  });
}

// --- Push ---

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInProgress: Promise<void> = Promise.resolve();

export function scheduleSyncPush(): void {
  if (!isAuthenticated() || !navigator.onLine) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushInProgress = pushInProgress.then(() => syncPush()).catch(err => {
      console.error('Sync push error:', err);
      window.dispatchEvent(new CustomEvent('sync:error', { detail: err }));
    });
  }, 2000);
}

async function syncPush(): Promise<void> {
  if (!isAuthenticated()) return;

  // Collect dirty keys
  const metaKeys = localList('__meta:');
  const dirtyChanges: SyncChange[] = [];

  for (const metaKey of metaKeys) {
    const key = metaKey.replace('__meta:', '');
    const meta = localGet<KeyMeta>(metaKey);
    if (!meta?.dirty) continue;

    const value = meta.deleted ? null : localGet(key);
    dirtyChanges.push({
      key,
      value,
      updatedAt: meta.updatedAt,
      version: meta.version,
      deleted: meta.deleted ?? false,
    });
  }

  if (dirtyChanges.length === 0) return;

  window.dispatchEvent(new CustomEvent('sync:start'));

  const response = await pushChanges(dirtyChanges);

  for (const result of response.results) {
    if (result.status === 'ok') {
      setMeta(result.key, {
        version: result.version,
        dirty: false,
        updatedAt: new Date().toISOString(),
      });
    } else if (result.status === 'conflict') {
      // Server wins — update local value
      if (result.value !== undefined && result.value !== null) {
        localSet(result.key, result.value);
      }
      setMeta(result.key, {
        version: result.version,
        dirty: false,
        updatedAt: new Date().toISOString(),
      });
      window.dispatchEvent(new CustomEvent('sync:conflict', { detail: { key: result.key } }));
    }
  }

  window.dispatchEvent(new CustomEvent('sync:complete'));

  // Pull after push to get any changes from other devices
  await syncPull();
}

// --- Pull ---

export async function syncPull(): Promise<void> {
  if (!isAuthenticated()) return;

  const lastPull = localGet<string>('__sync_last_pull') ?? undefined;

  window.dispatchEvent(new CustomEvent('sync:start'));

  const response = await pullChanges(lastPull);

  let hasChanges = false;

  for (const change of response.changes) {
    const meta = getMeta(change.key);

    // Skip locally dirty keys — they'll be resolved on next push
    if (meta?.dirty) continue;

    if (change.deleted) {
      localDelete(change.key);
    } else if (change.value !== null && change.value !== undefined) {
      // Write directly to localStorage (bypass adapter to avoid re-triggering sync)
      localSet(change.key, change.value);
    }

    setMeta(change.key, {
      version: change.version,
      dirty: false,
      updatedAt: change.updatedAt,
    });

    hasChanges = true;
  }

  localSet('__sync_last_pull', response.serverTime);

  if (hasChanges) {
    window.dispatchEvent(new CustomEvent('sync:updated'));
  }

  window.dispatchEvent(new CustomEvent('sync:complete'));
}

// --- Initial sync (for migration from anonymous to authenticated) ---

export async function performInitialSync(): Promise<void> {
  // Collect all data keys (exclude internal __ prefixed keys)
  const allKeys = localList('').filter(k => !k.startsWith('__'));

  if (allKeys.length > 0) {
    const changes: SyncChange[] = allKeys.map(key => ({
      key,
      value: localGet(key),
      updatedAt: new Date().toISOString(),
      version: 0, // New to server
      deleted: false,
    }));

    window.dispatchEvent(new CustomEvent('sync:start'));

    const response = await pushChanges(changes);

    for (const result of response.results) {
      if (result.status === 'ok') {
        setMeta(result.key, {
          version: result.version,
          dirty: false,
          updatedAt: new Date().toISOString(),
        });
      } else if (result.status === 'conflict') {
        // Server already has this key (from another device)
        // For array-type keys like programs:list, merge instead of overwrite
        const localValue = localGet(result.key);
        if (Array.isArray(localValue) && Array.isArray(result.value)) {
          const merged = [...new Set([...localValue, ...(result.value as unknown[])])];
          localSet(result.key, merged);
          // Mark as dirty so merged value gets pushed
          setMeta(result.key, {
            version: result.version,
            dirty: true,
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Non-array: server wins
          if (result.value !== undefined && result.value !== null) {
            localSet(result.key, result.value);
          }
          setMeta(result.key, {
            version: result.version,
            dirty: false,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  // Pull to get any server-only data
  await syncPull();

  // Push any merged array keys
  await syncPush();

  window.dispatchEvent(new CustomEvent('sync:updated'));
  window.dispatchEvent(new CustomEvent('sync:complete'));
}

// --- Online/offline ---

export function initSyncListeners(): void {
  window.addEventListener('online', () => {
    if (isAuthenticated()) {
      scheduleSyncPush();
    }
  });

  // Periodic pull every 5 minutes
  setInterval(() => {
    if (isAuthenticated() && navigator.onLine && document.visibilityState === 'visible') {
      syncPull().catch(console.error);
    }
  }, 5 * 60 * 1000);
}
