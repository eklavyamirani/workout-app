/**
 * Runtime (non-secret) deployment configuration.
 *
 * The published frontend image is immutable and environment-agnostic: no domains,
 * API URLs or OIDC identifiers are baked in at build time. Instead the container
 * serves `/runtime-config.json`, which the deployment mounts, so the same image
 * digest can serve multiple environments.
 *
 * Vite env vars are only used as a fallback for local development.
 */
export interface RuntimeConfig {
  /** Base URL of the API, e.g. "https://workout.example" or "http://127.0.0.1:5000". */
  apiBaseUrl?: string;
  /** Free-form deployment identifier, e.g. "preview-a" or "production". */
  deploymentMode?: string;
  oidcAuthority?: string;
  oidcClientId?: string;
  oidcRedirectUri?: string;
}

const RUNTIME_CONFIG_URL = '/runtime-config.json';

let cached: RuntimeConfig | null = null;

function envFallback(): RuntimeConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    apiBaseUrl: env.VITE_API_BASE_URL,
    deploymentMode: env.VITE_DEPLOYMENT_MODE,
    oidcAuthority: env.VITE_OIDC_AUTHORITY,
    oidcClientId: env.VITE_OIDC_CLIENT_ID,
    oidcRedirectUri: env.VITE_OIDC_REDIRECT_URI,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitize(raw: unknown): RuntimeConfig {
  if (raw === null || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const config: RuntimeConfig = {};
  for (const key of [
    'apiBaseUrl',
    'deploymentMode',
    'oidcAuthority',
    'oidcClientId',
    'oidcRedirectUri',
  ] as const) {
    if (isNonEmptyString(source[key])) {
      config[key] = (source[key] as string).trim();
    }
  }
  return config;
}

/**
 * Fetches `/runtime-config.json` once. A missing or invalid file is not fatal:
 * the app falls back to build-time env values (local development) or same-origin defaults.
 */
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (cached) return cached;

  const fallback = envFallback();
  try {
    const response = await fetch(RUNTIME_CONFIG_URL, { cache: 'no-store' });
    if (response.ok) {
      cached = { ...fallback, ...sanitize(await response.json()) };
      return cached;
    }
  } catch {
    // Network/parse failures fall through to the build-time defaults.
  }

  cached = fallback;
  return cached;
}

export function getRuntimeConfig(): RuntimeConfig {
  return cached ?? envFallback();
}

/** Test seam: resets the memoized configuration. */
export function resetRuntimeConfig(): void {
  cached = null;
}

/**
 * Resolves the API root. Same-origin `/api` is used unless a deployment supplies
 * an explicit `apiBaseUrl`.
 */
export function getApiBaseUrl(): string {
  const configured = getRuntimeConfig().apiBaseUrl;
  if (!isNonEmptyString(configured)) return '/api';
  return `${configured.replace(/\/+$/, '')}/api`;
}
