# Tasks: Workout Tracker Web Application

**Input**: Design documents from `/specs/001-workout-tracker/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: Tests are NOT included in this implementation plan per specification requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `frontend/src/`, `backend/src/` (optional)
- Paths shown below follow architecture defined in [plan.md](plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project directory structure (frontend/, backend/, docker-compose.yml)
- [ ] T002 [P] Initialize React TypeScript frontend with Vite in frontend/ directory
- [ ] T003 [P] Configure TypeScript strict mode in frontend/tsconfig.json
- [ ] T004 [P] Setup ESLint and Prettier in frontend/.eslintrc.json and frontend/.prettierrc
- [ ] T005 [P] Install core frontend dependencies (React Query, Material-UI, react-router-dom, idb, uuid, date-fns)
- [ ] T006 [P] Configure path aliases in frontend/tsconfig.json (@/components, @/services, @/types, @/utils)
- [ ] T007 [P] Setup Jest and React Testing Library in frontend/
- [ ] T008 [P] Create test utilities and setup file in frontend/src/test-utils/setup.ts
- [ ] T009 [P] Configure Vite build settings and environment variables in frontend/vite.config.ts
- [ ] T010 [P] Setup Docker multi-stage build for frontend in frontend/docker/Dockerfile
- [ ] T011 [P] Create nginx configuration for production frontend serving in frontend/docker/nginx.conf
- [ ] T012 [P] Configure Docker Compose for development environment in docker-compose.yml
- [ ] T013 [P] Setup Git ignore patterns for node_modules, build artifacts, and IDE files
- [ ] T014 [P] Create README.md with setup and development instructions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Type System and Data Models

- [ ] T015 [P] Create common TypeScript types in frontend/src/types/common.ts (ApiResponse, ServiceResult, PaginatedResponse)
- [ ] T016 [P] Create Workout entity types in frontend/src/types/workout.ts (Workout, WorkoutExercise, Set)
- [ ] T017 [P] Create Exercise entity types in frontend/src/types/exercise.ts (Exercise, ExerciseCategory, MuscleGroup, Equipment enums)
- [ ] T018 [P] Create Template entity types in frontend/src/types/template.ts (Template, TemplateExercise, TemplateSet)
- [ ] T019 [P] Create Program entity types in frontend/src/types/program.ts (Program, ProgramWeek, ProgramDay)
- [ ] T020 [P] Create PersonalRecord entity types in frontend/src/types/personalRecord.ts (PersonalRecord, PRType)
- [ ] T021 [P] Create Analytics types in frontend/src/types/analytics.ts (ProgressData, WeeklyRecap, TimeFrame)
- [ ] T022 Create index barrel export for all types in frontend/src/types/index.ts

### Storage Layer

- [ ] T023 [P] Create IStorageService interface in frontend/src/services/storage/IStorageService.ts
- [ ] T024 [P] Implement LocalStorageService in frontend/src/services/storage/LocalStorageService.ts
- [ ] T025 [P] Implement IndexedDBService in frontend/src/services/storage/IndexedDBService.ts
- [ ] T026 [P] Create storage error types in frontend/src/services/storage/errors.ts
- [ ] T027 Implement HybridStorageService (LocalStorage + IndexedDB) in frontend/src/services/storage/HybridStorageService.ts
- [ ] T028 Create storage service factory in frontend/src/services/storage/index.ts

### Service Interfaces

- [ ] T029 [P] Create IWorkoutService interface in frontend/src/services/interfaces/IWorkoutService.ts
- [ ] T030 [P] Create IExerciseService interface in frontend/src/services/interfaces/IExerciseService.ts
- [ ] T031 [P] Create ITemplateService interface in frontend/src/services/interfaces/ITemplateService.ts
- [ ] T032 [P] Create IProgramService interface in frontend/src/services/interfaces/IProgramService.ts
- [ ] T033 [P] Create IAnalyticsService interface in frontend/src/services/interfaces/IAnalyticsService.ts
- [ ] T034 [P] Create IExportService interface in frontend/src/services/interfaces/IExportService.ts
- [ ] T035 Create service interface barrel export in frontend/src/services/interfaces/index.ts

### React Infrastructure

- [ ] T036 [P] Setup React Query provider in frontend/src/providers/QueryProvider.tsx
- [ ] T037 [P] Setup Material-UI theme provider in frontend/src/providers/ThemeProvider.tsx
- [ ] T038 [P] Configure MUI theme with app colors and typography in frontend/src/styles/theme.ts
- [ ] T039 [P] Create routing structure in frontend/src/App.tsx
- [ ] T040 [P] Create global styles and CSS reset in frontend/src/styles/global.css
- [ ] T041 Create root providers component wrapping all providers in frontend/src/providers/index.tsx

### Utility Functions

- [ ] T042 [P] Create date formatting utilities in frontend/src/utils/dateUtils.ts
- [ ] T043 [P] Create validation utilities in frontend/src/utils/validation.ts
- [ ] T044 [P] Create UUID generation utility in frontend/src/utils/uuid.ts
- [ ] T045 [P] Create number formatting utilities in frontend/src/utils/numberUtils.ts
- [ ] T046 Create utility barrel export in frontend/src/utils/index.ts

### Common UI Components

- [ ] T047 [P] Create LoadingSpinner component in frontend/src/components/common/LoadingSpinner.tsx
- [ ] T048 [P] Create ConfirmDialog component in frontend/src/components/common/ConfirmDialog.tsx
- [ ] T049 [P] Create Toast notification component in frontend/src/components/common/Toast.tsx
- [ ] T050 [P] Create SearchInput component in frontend/src/components/common/SearchInput.tsx
- [ ] T051 [P] Create FilterChips component in frontend/src/components/common/FilterChips.tsx
- [ ] T052 [P] Create DataTable component in frontend/src/components/common/DataTable.tsx
- [ ] T053 [P] Create StatsCard component in frontend/src/components/common/StatsCard.tsx
- [ ] T054 [P] Create NumberInput component in frontend/src/components/common/NumberInput.tsx
- [ ] T055 [P] Create AutoSuggestInput component in frontend/src/components/common/AutoSuggestInput.tsx
- [ ] T056 Create common components barrel export in frontend/src/components/common/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Workout Logging (Priority: P1) 🎯 MVP

**Goal**: Enable users to log workouts quickly during active exercise sessions with minimal taps/clicks, recording exercises, sets, reps, and weights

**Independent Test**: Create a new workout, add exercises with sets/reps/weight, mark it complete. Verify all data persists and can be viewed in history.

### Service Layer for US1

- [ ] T057 [P] [US1] Implement WorkoutService CRUD operations in frontend/src/services/WorkoutService.ts
- [ ] T058 [P] [US1] Implement workout query methods (getByDateRange, getInProgress) in frontend/src/services/WorkoutService.ts
- [ ] T059 [US1] Implement workout action methods (startWorkout, completeWorkout, addExercise, addSet) in frontend/src/services/WorkoutService.ts

### Custom Hooks for US1

- [ ] T060 [P] [US1] Create useWorkout hook for workout management in frontend/src/hooks/useWorkout.ts
- [ ] T061 [P] [US1] Create useWorkoutHistory hook for fetching workout list in frontend/src/hooks/useWorkoutHistory.ts

### UI Components for US1

- [ ] T062 [P] [US1] Create WorkoutSession container component in frontend/src/components/workout/WorkoutSession.tsx
- [ ] T063 [P] [US1] Create ExerciseLogger component in frontend/src/components/workout/ExerciseLogger.tsx
- [ ] T064 [P] [US1] Create SetLogger component in frontend/src/components/workout/SetLogger.tsx
- [ ] T065 [P] [US1] Create RestTimer component in frontend/src/components/workout/RestTimer.tsx
- [ ] T066 [P] [US1] Create WorkoutHeader component in frontend/src/components/workout/WorkoutHeader.tsx
- [ ] T067 [P] [US1] Create WorkoutHistory list component in frontend/src/components/workout/WorkoutHistory.tsx
- [ ] T068 [P] [US1] Create WorkoutCard summary component in frontend/src/components/workout/WorkoutCard.tsx
- [ ] T069 [US1] Create workout routing and navigation in frontend/src/pages/WorkoutPage.tsx
- [ ] T070 [US1] Implement auto-suggestion logic for previous set values in frontend/src/utils/workoutUtils.ts
- [ ] T071 [US1] Add workout completion validation and persistence in WorkoutSession component

**Checkpoint**: User Story 1 complete - Users can now log workouts end-to-end

---

## Phase 4: User Story 2 - Exercise Library Management (Priority: P2)

**Goal**: Enable users to manage a personal exercise database with categories, muscle groups, and equipment tags for organizing their training exercises

**Independent Test**: Create, edit, categorize, filter, and archive exercises. Verify exercise library persists and exercises can be searched/filtered effectively.

### Service Layer for US2

- [ ] T072 [P] [US2] Implement ExerciseService CRUD operations in frontend/src/services/ExerciseService.ts
- [ ] T073 [P] [US2] Implement exercise search and filtering methods in frontend/src/services/ExerciseService.ts
- [ ] T074 [US2] Implement exercise validation (duplicate names, required fields) in frontend/src/services/ExerciseService.ts

### Custom Hooks for US2

- [ ] T075 [P] [US2] Create useExercises hook for exercise library management in frontend/src/hooks/useExercises.ts
- [ ] T076 [P] [US2] Create useExerciseSearch hook for search/filter functionality in frontend/src/hooks/useExerciseSearch.ts

### UI Components for US2

- [ ] T077 [P] [US2] Create ExerciseLibrary container component in frontend/src/components/exercises/ExerciseLibrary.tsx
- [ ] T078 [P] [US2] Create ExerciseCard display component in frontend/src/components/exercises/ExerciseCard.tsx
- [ ] T079 [P] [US2] Create ExerciseForm for create/edit in frontend/src/components/exercises/ExerciseForm.tsx
- [ ] T080 [P] [US2] Create ExerciseFilters component in frontend/src/components/exercises/ExerciseFilters.tsx
- [ ] T081 [P] [US2] Create ExerciseSelector modal for workout logging integration in frontend/src/components/exercises/ExerciseSelector.tsx
- [ ] T082 [US2] Create exercise library routing in frontend/src/pages/ExerciseLibraryPage.tsx
- [ ] T083 [US2] Integrate ExerciseSelector with WorkoutSession component (update T062 component)
- [ ] T084 [US2] Add default exercise seed data in frontend/src/data/defaultExercises.ts

**Checkpoint**: User Story 2 complete - Users can now manage comprehensive exercise library

---

## Phase 5: User Story 3 - Workout Templates (Priority: P3)

**Goal**: Enable users to save frequently used workout routines as templates for quick session startup without rebuilding exercise lists

**Independent Test**: Save a completed workout as template, load template to start new workout, modify and update template. Verify templates persist and can be managed.

### Service Layer for US3

- [ ] T085 [P] [US3] Implement TemplateService CRUD operations in frontend/src/services/TemplateService.ts
- [ ] T086 [P] [US3] Implement createTemplateFromWorkout method in frontend/src/services/TemplateService.ts
- [ ] T087 [US3] Implement template cloning and search functionality in frontend/src/services/TemplateService.ts

### Custom Hooks for US3

- [ ] T088 [P] [US3] Create useTemplates hook for template management in frontend/src/hooks/useTemplates.ts
- [ ] T089 [P] [US3] Create useTemplateBuilder hook for template creation/editing in frontend/src/hooks/useTemplateBuilder.ts

### UI Components for US3

- [ ] T090 [P] [US3] Create TemplateList component in frontend/src/components/templates/TemplateList.tsx
- [ ] T091 [P] [US3] Create TemplateCard display component in frontend/src/components/templates/TemplateCard.tsx
- [ ] T092 [P] [US3] Create TemplateEditor component in frontend/src/components/templates/TemplateEditor.tsx
- [ ] T093 [P] [US3] Create TemplateExerciseBuilder component in frontend/src/components/templates/TemplateExerciseBuilder.tsx
- [ ] T094 [P] [US3] Create TemplateSelector modal for workout startup in frontend/src/components/templates/TemplateSelector.tsx
- [ ] T095 [US3] Create template routing in frontend/src/pages/TemplatesPage.tsx
- [ ] T096 [US3] Integrate template loading into WorkoutSession component (update T062 component)
- [ ] T097 [US3] Add "Save as Template" button to workout completion flow

**Checkpoint**: User Story 3 complete - Users can now use templates for rapid workout setup

---

## Phase 6: User Story 4 - Progress Visualization (Priority: P4)

**Goal**: Enable users to view progress over time through charts showing weight progression, volume trends, and personal records for motivation and tracking

**Independent Test**: With historical workout data, view progress charts for specific exercises, check overall volume trends, and verify PR detection and tracking.

### Service Layer for US4

- [ ] T098 [P] [US4] Implement AnalyticsService PR calculation methods in frontend/src/services/AnalyticsService.ts
- [ ] T099 [P] [US4] Implement progress data aggregation methods in frontend/src/services/AnalyticsService.ts
- [ ] T100 [P] [US4] Implement volume progression calculations in frontend/src/services/AnalyticsService.ts
- [ ] T101 [US4] Implement automatic PR detection on workout completion in frontend/src/services/AnalyticsService.ts

### Custom Hooks for US4

- [ ] T102 [P] [US4] Create useProgressData hook for chart data in frontend/src/hooks/useProgressData.ts
- [ ] T103 [P] [US4] Create usePersonalRecords hook for PR management in frontend/src/hooks/usePersonalRecords.ts
- [ ] T104 [P] [US4] Create useVolumeData hook for volume analytics in frontend/src/hooks/useVolumeData.ts

### UI Components for US4

- [ ] T105 [P] [US4] Install and configure Recharts library in frontend/package.json
- [ ] T106 [P] [US4] Create ProgressChart component in frontend/src/components/progress/ProgressChart.tsx
- [ ] T107 [P] [US4] Create PersonalRecordsList component in frontend/src/components/progress/PersonalRecordsList.tsx
- [ ] T108 [P] [US4] Create PersonalRecordBadge notification component in frontend/src/components/progress/PersonalRecordBadge.tsx
- [ ] T109 [P] [US4] Create VolumeChart component in frontend/src/components/progress/VolumeChart.tsx
- [ ] T110 [P] [US4] Create ExerciseProgressView component in frontend/src/components/progress/ExerciseProgressView.tsx
- [ ] T111 [US4] Create progress dashboard page in frontend/src/pages/ProgressPage.tsx
- [ ] T112 [US4] Integrate PR detection into workout completion flow (update T071 logic)
- [ ] T113 [US4] Add PR celebration modal/animation on achievement

**Checkpoint**: User Story 4 complete - Users can now visualize progress and track PRs

---

## Phase 7: User Story 5 - Structured Programs (Priority: P5)

**Goal**: Enable users to follow multi-week training programs with defined progression schemes, tracking position while maintaining historical data when restarting

**Independent Test**: Create a program with multiple weeks/days, follow it for several sessions with progression tracking, complete cycle and restart. Verify program state persistence.

### Service Layer for US5

- [ ] T114 [P] [US5] Implement ProgramService CRUD operations in frontend/src/services/ProgramService.ts
- [ ] T115 [P] [US5] Implement program lifecycle methods (start, pause, restart, advance) in frontend/src/services/ProgramService.ts
- [ ] T116 [US5] Implement program progression tracking and history in frontend/src/services/ProgramService.ts

### Custom Hooks for US5

- [ ] T117 [P] [US5] Create usePrograms hook for program management in frontend/src/hooks/usePrograms.ts
- [ ] T118 [P] [US5] Create useProgramBuilder hook for program creation in frontend/src/hooks/useProgramBuilder.ts
- [ ] T119 [P] [US5] Create useActiveProgram hook for current program tracking in frontend/src/hooks/useActiveProgram.ts

### UI Components for US5

- [ ] T120 [P] [US5] Create ProgramList component in frontend/src/components/programs/ProgramList.tsx
- [ ] T121 [P] [US5] Create ProgramCard display component in frontend/src/components/programs/ProgramCard.tsx
- [ ] T122 [P] [US5] Create ProgramBuilder component in frontend/src/components/programs/ProgramBuilder.tsx
- [ ] T123 [P] [US5] Create ProgramWeekEditor component in frontend/src/components/programs/ProgramWeekEditor.tsx
- [ ] T124 [P] [US5] Create ProgramTracker component in frontend/src/components/programs/ProgramTracker.tsx
- [ ] T125 [P] [US5] Create ProgramCalendarView component in frontend/src/components/programs/ProgramCalendarView.tsx
- [ ] T126 [US5] Create program management page in frontend/src/pages/ProgramsPage.tsx
- [ ] T127 [US5] Integrate active program with workout startup (update T062 component)
- [ ] T128 [US5] Add previous week's weights display during program workouts

**Checkpoint**: User Story 5 complete - Users can now follow structured training programs

---

## Phase 8: User Story 6 - Weekly Performance Summaries (Priority: P6)

**Goal**: Enable users to receive weekly recap reports showing workouts completed, volume trends, new PRs, and missed sessions for training consistency awareness

**Independent Test**: With several weeks of workout data, generate recap reports, compare periods (current vs previous week, 4-week and 12-week rolling averages). Verify calculation accuracy.

### Service Layer for US6

- [ ] T129 [P] [US6] Implement weekly recap generation in frontend/src/services/AnalyticsService.ts
- [ ] T130 [P] [US6] Implement week comparison logic in frontend/src/services/AnalyticsService.ts
- [ ] T131 [US6] Implement rolling average calculations (4-week, 12-week) in frontend/src/services/AnalyticsService.ts

### Custom Hooks for US6

- [ ] T132 [P] [US6] Create useWeeklyRecap hook in frontend/src/hooks/useWeeklyRecap.ts
- [ ] T133 [P] [US6] Create useWorkoutFrequency hook in frontend/src/hooks/useWorkoutFrequency.ts

### UI Components for US6

- [ ] T134 [P] [US6] Create WeeklyRecap component in frontend/src/components/analytics/WeeklyRecap.tsx
- [ ] T135 [P] [US6] Create WeekComparison component in frontend/src/components/analytics/WeekComparison.tsx
- [ ] T136 [P] [US6] Create RollingAveragesChart component in frontend/src/components/analytics/RollingAveragesChart.tsx
- [ ] T137 [P] [US6] Create ConsistencyTracker component in frontend/src/components/analytics/ConsistencyTracker.tsx
- [ ] T138 [P] [US6] Create MissedSessionsAlert component in frontend/src/components/analytics/MissedSessionsAlert.tsx
- [ ] T139 [US6] Create analytics dashboard page in frontend/src/pages/AnalyticsPage.tsx
- [ ] T140 [US6] Add weekly recap to home dashboard summary

**Checkpoint**: User Story 6 complete - Users can now track weekly performance and consistency

---

## Phase 9: Data Portability & PWA Features

**Goal**: Enable data export/import and progressive web app functionality for offline use and data backup

### Export/Import Service

- [ ] T141 [P] Implement JSON export functionality in frontend/src/services/ExportService.ts
- [ ] T142 [P] Implement CSV export functionality in frontend/src/services/ExportService.ts
- [ ] T143 [P] Implement JSON import with validation in frontend/src/services/ExportService.ts
- [ ] T144 Implement data backup/restore functionality in frontend/src/services/ExportService.ts

### Export/Import UI

- [ ] T145 [P] Create ExportDialog component in frontend/src/components/settings/ExportDialog.tsx
- [ ] T146 [P] Create ImportDialog component in frontend/src/components/settings/ImportDialog.tsx
- [ ] T147 Create settings page with export/import controls in frontend/src/pages/SettingsPage.tsx

### PWA Setup

- [ ] T148 [P] Install and configure Workbox for service worker in frontend/src/sw.ts
- [ ] T149 [P] Create PWA manifest file in frontend/public/manifest.json
- [ ] T150 [P] Create app icons for PWA in frontend/public/icons/
- [ ] T151 [P] Configure service worker caching strategies for offline support
- [ ] T152 Integrate service worker registration in frontend/src/main.tsx

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final production readiness

### Documentation

- [ ] T153 [P] Create API documentation for all services in docs/api/
- [ ] T154 [P] Create component documentation with examples in docs/components/
- [ ] T155 [P] Update README with deployment instructions
- [ ] T156 [P] Create user guide documentation in docs/user-guide.md

### Performance Optimization

- [ ] T157 [P] Implement code splitting for feature routes in frontend/src/App.tsx
- [ ] T158 [P] Implement lazy loading for chart components
- [ ] T159 [P] Optimize bundle size (analyze and remove unused imports)
- [ ] T160 [P] Implement Web Workers for analytics calculations in frontend/src/workers/analyticsWorker.ts
- [ ] T161 Configure production build optimizations in frontend/vite.config.ts

### Error Handling & Logging

- [ ] T162 [P] Create global error boundary component in frontend/src/components/ErrorBoundary.tsx
- [ ] T163 [P] Implement error logging service in frontend/src/services/LoggingService.ts
- [ ] T164 Add error tracking to all service methods

### Accessibility

- [ ] T165 [P] Add ARIA labels to all interactive components
- [ ] T166 [P] Implement keyboard navigation for workout logging flow
- [ ] T167 [P] Add focus management for modal dialogs
- [ ] T168 Run accessibility audit with axe-core and fix violations

### Security

- [ ] T169 [P] Add input sanitization for user-generated content
- [ ] T170 [P] Implement CSP headers in nginx configuration
- [ ] T171 Validate all data before storage operations

### Testing Infrastructure

- [ ] T172 [P] Add integration tests for workout logging flow in frontend/tests/integration/
- [ ] T173 [P] Add integration tests for exercise library in frontend/tests/integration/
- [ ] T174 [P] Setup Playwright for E2E testing in frontend/tests/e2e/
- [ ] T175 Write E2E tests for critical user journeys

### Production Readiness

- [ ] T176 [P] Configure environment variables for production
- [ ] T177 [P] Setup CI/CD pipeline configuration
- [ ] T178 [P] Create Docker production build documentation
- [ ] T179 Run quickstart.md validation and update if needed
- [ ] T180 Final bundle size verification (<2MB gzipped target)
- [ ] T181 Final Lighthouse audit (>90 score target)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - MVP delivery point
- **User Story 2 (Phase 4)**: Depends on Foundational - Can run parallel to US1 if team capacity allows
- **User Story 3 (Phase 5)**: Depends on US1 (workout logging) and US2 (exercise library) - Integrates with both
- **User Story 4 (Phase 6)**: Depends on US1 (needs workout history data) - Can run parallel to US2/US3
- **User Story 5 (Phase 7)**: Depends on US3 (templates) - Can run parallel to US4/US6
- **User Story 6 (Phase 8)**: Depends on US1 (needs workout data) - Can run parallel to US2/US3/US5
- **Data Portability (Phase 9)**: Can run parallel to any user story phase after Foundational
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundational (Phase 2) ─────┬──────────────────────────────┐
                            │                               │
                            ├─> US1: Workout Logging        │
                            │   (Phase 3 - MVP) ────┐       │
                            │                       │       │
                            ├─> US2: Exercise Lib   │       │
                            │   (Phase 4) ──────────┤       │
                            │                       ├─> US3: Templates
                            │                       │   (Phase 5)
                            ├─> US4: Progress ──────┤
                            │   (Phase 6)           │
                            │                       │
                            ├─> US5: Programs ──────┘
                            │   (Phase 7) [needs US3]
                            │
                            └─> US6: Analytics
                                (Phase 8)
```

### Within Each User Story

1. Service layer first (business logic and data operations)
2. Custom hooks second (React state management)
3. UI components third (presentation layer)
4. Integration with existing components last

### Parallel Opportunities by Phase

**Phase 1 (Setup)**: All tasks marked [P] can run in parallel
**Phase 2 (Foundational)**: 
- Type definitions (T015-T022) in parallel
- Storage services (T023-T028) in parallel
- Service interfaces (T029-T035) in parallel
- React infrastructure (T036-T041) in parallel
- Utilities (T042-T046) in parallel
- Common components (T047-T056) in parallel

**Phase 3-8 (User Stories)**: 
- Service layer tasks within a story can run in parallel [P]
- Hooks within a story can run in parallel [P]
- Independent UI components can run in parallel [P]
- Different user stories can be worked on in parallel by different team members (respecting dependencies)

**Phase 9-10**: Most tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Service layer (can start simultaneously):
Task T057: "Implement WorkoutService CRUD operations"
Task T058: "Implement workout query methods"

# Then service completion task (sequential):
Task T059: "Implement workout action methods" (depends on T057, T058)

# Hooks (parallel after service layer complete):
Task T060: "Create useWorkout hook"
Task T061: "Create useWorkoutHistory hook"

# UI Components (parallel after hooks complete):
Task T062: "Create WorkoutSession container"
Task T063: "Create ExerciseLogger component"
Task T064: "Create SetLogger component"
Task T065: "Create RestTimer component"
Task T066: "Create WorkoutHeader component"
Task T067: "Create WorkoutHistory list"
Task T068: "Create WorkoutCard summary"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

This is the recommended approach for fastest time-to-value:

1. **Complete Phase 1**: Setup (T001-T014)
2. **Complete Phase 2**: Foundational (T015-T056) - CRITICAL foundation
3. **Complete Phase 3**: User Story 1 - Workout Logging (T057-T071)
4. **STOP and VALIDATE**: Test US1 independently with real workout sessions
5. **Complete Phase 4**: User Story 2 - Exercise Library (T072-T084)
6. **STOP and VALIDATE**: Test US1+US2 integration
7. **Deploy/Demo MVP**: This delivers core value - users can log workouts with custom exercises

### Incremental Delivery (All User Stories)

1. Setup + Foundational → Foundation ready (T001-T056)
2. Add User Story 1 → Test independently → **Deploy MVP** (T057-T071)
3. Add User Story 2 → Test integration → Deploy enhancement (T072-T084)
4. Add User Story 3 → Test templates → Deploy (T085-T097)
5. Add User Story 4 → Test progress tracking → Deploy (T098-T113)
6. Add User Story 5 → Test programs → Deploy (T114-T128)
7. Add User Story 6 → Test analytics → Deploy (T129-T140)
8. Add Data Portability → Test export/import → Deploy (T141-T152)
9. Polish & optimization → Final production release (T153-T181)

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

- **Developer A**: User Story 1 (T057-T071)
- **Developer B**: User Story 2 (T072-T084) [parallel to A]
- **Developer C**: User Story 4 (T098-T113) [parallel to A, B]
- **Developer D**: Data Portability (T141-T152) [parallel to all]

Then sequential for dependent stories:
- **Developer A**: User Story 3 after US1+US2 complete (T085-T097)
- **Developer B**: User Story 5 after US3 complete (T114-T128)
- **Developer C**: User Story 6 (T129-T140) [can continue in parallel]

---

## Task Summary

**Total Tasks**: 181

**Tasks by Phase**:
- Phase 1 (Setup): 14 tasks
- Phase 2 (Foundational): 42 tasks
- Phase 3 (US1 - MVP): 15 tasks
- Phase 4 (US2): 13 tasks
- Phase 5 (US3): 13 tasks
- Phase 6 (US4): 16 tasks
- Phase 7 (US5): 15 tasks
- Phase 8 (US6): 12 tasks
- Phase 9 (Data Portability): 12 tasks
- Phase 10 (Polish): 29 tasks

**MVP Scope** (Phases 1-4): 84 tasks
**Full Feature Set**: 181 tasks

**Parallel Opportunities**: ~60% of tasks marked [P] can run in parallel with proper team coordination

---

## Notes

- **[P] marker**: Tasks that can run in parallel (different files, no blocking dependencies)
- **[Story] label**: Maps task to specific user story for traceability and independent delivery
- Each user story is independently completable and testable
- Constitution compliance: All tasks align with code quality, testing, performance, and UX standards
- Tests are not included per specification requirements - focus on implementation
- Commit after each logical task group
- Stop at checkpoints to validate stories independently
- **MVP recommendation**: Complete through Phase 4 (User Stories 1 & 2) for initial deployment
