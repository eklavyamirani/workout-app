# Workout Tracker

## Overview
```
This application is a workout tracker that I want to use to track my workouts. My goal for this app is to require minimal interactions to plan and track my workouts, and get insights (progressions, rest times, plateaus, deload time, etc).
``` 

## Features
- Customize your workout plan and use progress from last week as a blueprint for the following week.
- Track weights, progress and derive insights.
- **Optional Authentication**: Feature-flagged auth layer supporting local development without external dependencies, and Supabase Auth (magic link + OAuth) in production.

## Preview
Below is a preview of the application:

![Workout Tracker Preview](./public/screenshot.jpeg)

## Installation (Dev)
0. Use the devcontainer (or use the compose to attach to the app container)
1. Navigate to the project directory:
   ```bash
   cd workout-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file and configure if needed:
   ```bash
   cp .env.local.example .env.local
   # For local development, VITE_ENABLE_AUTH=false is already set
   # No Supabase credentials needed for local dev
   ```

## Usage (Dev)
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open the application in your browser at the URL provided by the development server.

## Authentication

The app includes an optional feature-flagged authentication layer using an adapter pattern.

### Local Development (Default)
- Authentication is **disabled** by default (`VITE_ENABLE_AUTH=false`)
- Uses a no-op adapter that provides a mock user
- No Supabase credentials required
- App continues to use localStorage for all data

### Production/Staging
To enable Supabase authentication:

1. Set environment variables:
   ```bash
   VITE_ENABLE_AUTH=true
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. Supported auth methods:
   - Magic link (email)
   - OAuth providers: Google, GitHub, Microsoft/Azure, Apple

3. The app will use the real Supabase adapter for authentication

### Architecture
- `src/auth/adapter.ts`: Auth interface and adapter selector
- `src/auth/noopAdapter.ts`: No-op implementation for local dev
- `src/auth/supabaseAdapter.ts`: Real Supabase implementation
- `src/auth/AuthProvider.tsx`: React context for auth state
- `src/auth/AuthGate.tsx`: Gate component with loading state

## Testing (E2E)
End-to-end tests are written using Playwright and validate all major user flows.

### Run All Tests
```bash
npm run test:e2e
```

### Run Tests in UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Run Specific Test File
```bash
npx playwright test e2e/setup.spec.ts
```

### Run Tests Matching a Pattern
```bash
npx playwright test --grep "program setup"
```

### View Test Results & Screenshots

After running tests, view the interactive HTML report:
```bash
npm run test:e2e:report
```

### Run with Screenshots for All Tests
Capture screenshots at each test step for visual inspection:
```bash
npm run test:e2e:screenshots
```

### Test Artifacts

Two directories are generated during test runs (both are ignored in git):

**`playwright-report/`** - Interactive HTML Dashboard
- Single comprehensive report with all test results
- Includes screenshots, videos, and test timings
- Best for: reviewing overall test status and sharing results
- Access via: `npm run test:e2e:report`

**`test-results/`** - Raw Per-Test Artifacts
- One directory per test with screenshots, videos, and traces
- Full debugging information (DOM snapshots, network logs)
- Best for: investigating specific test failures
- Organized by test name for easy navigation
- Includes complete trace data viewable in Playwright Inspector

### Test Coverage
The E2E test suite covers:
- **Program Setup** (12 tests) - Exercise selection, custom exercises, weight entry
- **Navigation** (6 tests) - Header navigation, button states
- **Workout Sessions** (18 tests) - Starting workouts, logging sets, weight/rep adjustments, AMRAP
- **Exercise Library** (12 tests) - Exercise browser, custom exercise management
- **Data Persistence** (6 tests) - localStorage, page reloads, workout history

## Deployment
See `deploy/README.md` for container build/run instructions and zero-downtime rollout guidance. Configurable via env vars (e.g., `PORT`, `DEPLOYMENT_MODE`, secrets injected at runtime). Deployment assets live under `deploy/`.
