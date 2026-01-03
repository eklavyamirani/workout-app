# Quickstart Guide: Workout Tracker Development

**Date**: 2026-01-03  
**Phase**: 1 - Development Setup & Integration Scenarios  

## Prerequisites

### Required Software
- **Node.js**: 18+ (LTS recommended)
- **Docker**: 20.10+ with Docker Compose
- **Git**: 2.30+
- **VS Code**: Latest (recommended IDE)

### Recommended VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- ESLint
- Prettier - Code formatter
- Auto Rename Tag
- Bracket Pair Colorizer

## Project Setup

### 1. Initialize Frontend Project
```bash
# Create frontend directory structure
mkdir -p frontend/{src/{components,hooks,services,types,utils,styles},tests,public,docker}

cd frontend

# Initialize Vite React TypeScript project
npm create vite@latest . -- --template react-ts

# Install additional dependencies
npm install @mui/material @emotion/react @emotion/styled
npm install @tanstack/react-query
npm install react-router-dom
npm install @mui/x-charts
npm install idb  # IndexedDB wrapper
npm install uuid
npm install date-fns

# Install development dependencies
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D @types/uuid
npm install -D workbox-cli workbox-webpack-plugin
npm install -D eslint-config-prettier prettier
```

### 2. Configure TypeScript
Create `frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/services/*": ["./src/services/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 3. Setup ESLint and Prettier
Create `frontend/.eslintrc.json`:
```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["react-refresh"],
  "rules": {
    "react-refresh/only-export-components": [
      "warn",
      { "allowConstantExport": true }
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error"
  },
  "root": true
}
```

Create `frontend/.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

## Initial Development Workflow

### 1. Start with Core Types
Create `frontend/src/types/index.ts`:
```typescript
// Export all type definitions from data model
export * from './workout';
export * from './exercise';
export * from './template';
export * from './program';
export * from './analytics';
export * from './common';

// Common utility types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ServiceResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};
```

### 2. Implement Storage Service First
Create `frontend/src/services/storage/LocalStorageService.ts`:
```typescript
import { IStorageService, StorageInfo } from '../interfaces';

export class LocalStorageService implements IStorageService {
  async save<T>(key: string, data: T): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
    } catch (error) {
      throw new StorageError('Failed to save to localStorage', error);
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      throw new StorageError('Failed to load from localStorage', error);
    }
  }

  // ... implement remaining methods
}
```

### 3. Create Basic Service Layer
Create `frontend/src/services/WorkoutService.ts`:
```typescript
import { IWorkoutService } from './interfaces';
import { Workout, CreateWorkoutRequest } from '../types';
import { StorageService } from './storage';

export class WorkoutService implements IWorkoutService {
  constructor(private storage: StorageService) {}

  async createWorkout(request: CreateWorkoutRequest): Promise<Workout> {
    const workout: Workout = {
      id: crypto.randomUUID(),
      name: request.name || `Workout ${new Date().toLocaleDateString()}`,
      startTime: new Date(),
      isCompleted: false,
      exercises: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    const workouts = await this.getAllWorkouts();
    workouts.push(workout);
    await this.storage.save('workouts', workouts);

    return workout;
  }

  // ... implement remaining methods
}
```

### 4. Setup React Query Provider
Create `frontend/src/providers/QueryProvider.tsx`:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PropsWithChildren } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## Testing Setup

### 1. Configure Jest and React Testing Library
Create `frontend/src/test-utils/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Create test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Custom render function with providers
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const customRender = (ui: ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### 2. Write First Component Test
Create `frontend/src/components/WorkoutSession/__tests__/WorkoutSession.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '../../../test-utils/setup';
import { WorkoutSession } from '../WorkoutSession';
import { vi } from 'vitest';

const mockProps = {
  onWorkoutComplete: vi.fn(),
  onWorkoutSave: vi.fn(),
  onCancel: vi.fn(),
};

describe('WorkoutSession', () => {
  it('should render workout session interface', () => {
    render(<WorkoutSession {...mockProps} />);
    
    expect(screen.getByText(/start workout/i)).toBeInTheDocument();
  });

  it('should start new workout when clicked', async () => {
    render(<WorkoutSession {...mockProps} />);
    
    fireEvent.click(screen.getByText(/start workout/i));
    
    await waitFor(() => {
      expect(screen.getByText(/add exercise/i)).toBeInTheDocument();
    });
  });
});
```

## Development Scenarios

### Scenario 1: Quick Workout Logging (P1 - MVP)

#### Development Steps:
1. **Create basic workout form components**
   ```bash
   mkdir -p frontend/src/components/{WorkoutSession,ExerciseLogger,SetLogger}
   ```

2. **Implement core workout service**
   - WorkoutService with CRUD operations
   - Local storage integration
   - Exercise library service

3. **Build UI components**
   - WorkoutSession (main container)
   - ExerciseLogger (exercise-specific interface)
   - SetLogger (individual set tracking)

4. **Test the complete flow**
   ```typescript
   // Integration test example
   it('should complete full workout logging flow', async () => {
     // Start workout
     // Add exercise
     // Log sets with weight/reps
     // Complete workout
     // Verify data persistence
   });
   ```

#### Acceptance Criteria Verification:
- [ ] User can create workout in under 30 seconds per exercise
- [ ] Previous set suggestions work correctly
- [ ] Workout saves with timestamp and all data

### Scenario 2: Exercise Library Management (P2)

#### Development Steps:
1. **Create exercise management components**
2. **Implement search and filtering**
3. **Add exercise form validation**
4. **Test category and muscle group filtering**

### Scenario 3: Offline Functionality

#### Service Worker Setup:
```typescript
// frontend/public/sw.js
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache workout data
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
```

## Performance Testing

### Bundle Size Monitoring
```bash
# Add to package.json scripts
"analyze": "npm run build && npx vite-bundle-analyzer dist"
"lighthouse": "lighthouse http://localhost:5173 --output json --output-path ./lighthouse-report.json"
```

### Performance Benchmarks
```typescript
// Performance test example
describe('Performance Requirements', () => {
  it('should load app in under 2 seconds', async () => {
    const startTime = performance.now();
    render(<App />);
    await waitFor(() => screen.getByTestId('main-content'));
    const loadTime = performance.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });

  it('should handle 1000 workouts without performance degradation', async () => {
    // Generate test data with 1000 workouts
    // Measure render and query performance
    // Assert response times remain under thresholds
  });
});
```

## Docker Configuration

### Frontend Dockerfile
```dockerfile
# Development stage
FROM node:18-alpine as development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Production stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine as production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      target: development
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    
  # Optional backend for future development
  backend:
    build:
      context: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - database
    environment:
      - ASPNETCORE_ENVIRONMENT=Development

  # Optional database for future development  
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: workouttracker
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Common Development Commands

```bash
# Development workflow
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm run test            # Run unit tests
npm run test:e2e        # Run Playwright tests
npm run lint            # Run ESLint
npm run format          # Run Prettier
npm run type-check      # TypeScript compilation check

# Docker workflow
docker-compose up -d     # Start development environment
docker-compose logs -f frontend  # View frontend logs
docker-compose exec frontend npm run test  # Run tests in container
```

This quickstart guide provides a comprehensive foundation for beginning development of the workout tracker application while maintaining alignment with all architectural decisions and quality standards.