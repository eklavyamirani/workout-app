# Workout Tracker

## Overview
```
This application is a workout tracker that I want to use to track my workouts. My goal for this app is to require minimal interactions to plan and track my workouts, and get insights (progressions, rest times, plateaus, deload time, etc).
``` 

## Features
- Customize your workout plan and use progress from last week as a blueprint for the following week.
- Track weights, progress and derive insights.

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

## Usage (Dev)
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open the application in your browser at the URL provided by the development server.

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

### View Test Results
```bash
npm run test:e2e:report
```

### Test Coverage
The E2E test suite covers:
- **Program Setup** (12 tests) - Exercise selection, custom exercises, weight entry
- **Navigation** (6 tests) - Header navigation, button states
- **Workout Sessions** (18 tests) - Starting workouts, logging sets, weight/rep adjustments, AMRAP
- **Exercise Library** (12 tests) - Exercise browser, custom exercise management
- **Data Persistence** (6 tests) - localStorage, page reloads, workout history

## Deployment
See `deploy/README.md` for container build/run instructions and zero-downtime rollout guidance. Configurable via env vars (e.g., `PORT`, `DEPLOYMENT_MODE`, secrets injected at runtime). Deployment assets live under `deploy/`.
