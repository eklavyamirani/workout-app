# Frontend Runtime Configuration

The frontend image is environment-neutral. Environment-specific values are loaded at runtime from `/runtime-config/config.js`.

## Loader Contract

The runtime config file must populate:

```js
window.__WORKOUT_APP_CONFIG__ = {
  apiBaseUrl: string,
  oidcAuthority: string,
  oidcClientId: string,
  oidcRedirectUri: string,
  environmentName?: string
}
```

If required keys are missing or empty, startup fails with a visible configuration error.

## Production Example

```js
window.__WORKOUT_APP_CONFIG__ = {
  apiBaseUrl: '/api',
  oidcAuthority: 'https://auth.homelab.example/application/o/workout-app/',
  oidcClientId: 'workout-app-frontend',
  oidcRedirectUri: 'https://workout.homelab.example/callback',
  environmentName: 'production'
}
```

## Preview Example

```js
window.__WORKOUT_APP_CONFIG__ = {
  apiBaseUrl: '/api',
  oidcAuthority: 'https://auth.homelab.example/application/o/workout-app-preview/',
  oidcClientId: 'workout-app-frontend-preview',
  oidcRedirectUri: 'https://pr-24.workout.homelab.example/callback',
  environmentName: 'preview'
}
```

These examples intentionally contain no secrets.
