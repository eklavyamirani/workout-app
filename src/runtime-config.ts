export type RuntimeConfig = {
  apiBaseUrl: string
  oidcAuthority: string
  oidcClientId: string
  oidcRedirectUri: string
  environmentName?: string
}

declare global {
  interface Window {
    __WORKOUT_APP_CONFIG__?: Partial<RuntimeConfig>
  }
}

function requireString(value: unknown, key: keyof RuntimeConfig): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required runtime configuration: ${key}`)
  }

  return value
}

export function loadRuntimeConfig(): RuntimeConfig {
  const config = window.__WORKOUT_APP_CONFIG__

  if (!config) {
    throw new Error('Runtime configuration was not loaded from /runtime-config/config.js')
  }

  return {
    apiBaseUrl: requireString(config.apiBaseUrl, 'apiBaseUrl'),
    oidcAuthority: requireString(config.oidcAuthority, 'oidcAuthority'),
    oidcClientId: requireString(config.oidcClientId, 'oidcClientId'),
    oidcRedirectUri: requireString(config.oidcRedirectUri, 'oidcRedirectUri'),
    environmentName:
      typeof config.environmentName === 'string' && config.environmentName.trim() !== ''
        ? config.environmentName
        : undefined,
  }
}
