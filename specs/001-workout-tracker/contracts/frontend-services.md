# Frontend Service Contracts

**Date**: 2026-01-03  
**Phase**: 1 - API Design & Service Layer  

## Service Layer Architecture

The application uses a service-oriented architecture where all data operations are abstracted through service interfaces. This enables clean separation between UI components and data management logic.

## Workout Service Contract

### Interface Definition
```typescript
interface IWorkoutService {
  // Workout CRUD operations
  createWorkout(workout: CreateWorkoutRequest): Promise<Workout>;
  getWorkout(id: string): Promise<Workout | null>;
  getAllWorkouts(): Promise<Workout[]>;
  updateWorkout(id: string, updates: UpdateWorkoutRequest): Promise<Workout>;
  deleteWorkout(id: string): Promise<void>;
  
  // Workout queries
  getWorkoutsByDateRange(startDate: Date, endDate: Date): Promise<Workout[]>;
  getWorkoutsByExercise(exerciseId: string): Promise<Workout[]>;
  getInProgressWorkouts(): Promise<Workout[]>;
  
  // Workout actions
  startWorkout(template?: Template): Promise<Workout>;
  completeWorkout(workoutId: string): Promise<Workout>;
  addExerciseToWorkout(workoutId: string, exercise: AddExerciseRequest): Promise<Workout>;
  addSetToExercise(workoutId: string, exerciseId: string, set: CreateSetRequest): Promise<Workout>;
}

// Request/Response Types
interface CreateWorkoutRequest {
  name?: string;
  templateId?: string;
  exercises?: CreateWorkoutExerciseRequest[];
}

interface CreateWorkoutExerciseRequest {
  exerciseId: string;
  sets?: CreateSetRequest[];
  notes?: string;
}

interface CreateSetRequest {
  repetitions: number;
  weight?: number;
  restTime?: number;
  notes?: string;
}

interface UpdateWorkoutRequest {
  name?: string;
  notes?: string;
  exercises?: UpdateWorkoutExerciseRequest[];
}

interface UpdateWorkoutExerciseRequest {
  id?: string;
  exerciseId: string;
  sets: UpdateSetRequest[];
  notes?: string;
  order?: number;
}

interface UpdateSetRequest {
  id?: string;
  repetitions: number;
  weight?: number;
  restTime?: number;
  isCompleted: boolean;
  notes?: string;
}

interface AddExerciseRequest {
  exerciseId: string;
  order?: number;
}
```

## Exercise Service Contract

### Interface Definition
```typescript
interface IExerciseService {
  // Exercise CRUD operations
  createExercise(exercise: CreateExerciseRequest): Promise<Exercise>;
  getExercise(id: string): Promise<Exercise | null>;
  getAllExercises(includeArchived?: boolean): Promise<Exercise[]>;
  updateExercise(id: string, updates: UpdateExerciseRequest): Promise<Exercise>;
  archiveExercise(id: string): Promise<void>;
  
  // Exercise queries
  searchExercises(query: string): Promise<Exercise[]>;
  getExercisesByCategory(category: ExerciseCategory): Promise<Exercise[]>;
  getExercisesByMuscleGroup(muscleGroup: MuscleGroup): Promise<Exercise[]>;
  getExercisesByEquipment(equipment: Equipment): Promise<Exercise[]>;
  
  // Exercise library management
  importExercises(exercises: ImportExerciseRequest[]): Promise<Exercise[]>;
  validateExerciseName(name: string, excludeId?: string): Promise<boolean>;
}

interface CreateExerciseRequest {
  name: string;
  category: ExerciseCategory;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  instructions?: string;
}

interface UpdateExerciseRequest {
  name?: string;
  category?: ExerciseCategory;
  muscleGroups?: MuscleGroup[];
  equipment?: Equipment[];
  instructions?: string;
}

interface ImportExerciseRequest {
  name: string;
  category: ExerciseCategory;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  instructions?: string;
  source?: string;
}
```

## Template Service Contract

### Interface Definition
```typescript
interface ITemplateService {
  // Template CRUD operations
  createTemplate(template: CreateTemplateRequest): Promise<Template>;
  getTemplate(id: string): Promise<Template | null>;
  getAllTemplates(): Promise<Template[]>;
  updateTemplate(id: string, updates: UpdateTemplateRequest): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  
  // Template actions
  createTemplateFromWorkout(workoutId: string, name: string): Promise<Template>;
  cloneTemplate(templateId: string, newName: string): Promise<Template>;
  
  // Template queries
  searchTemplates(query: string): Promise<Template[]>;
  getTemplatesByTag(tag: string): Promise<Template[]>;
}

interface CreateTemplateRequest {
  name: string;
  description?: string;
  exercises: CreateTemplateExerciseRequest[];
  tags?: string[];
}

interface CreateTemplateExerciseRequest {
  exerciseId: string;
  sets: CreateTemplateSetRequest[];
  notes?: string;
}

interface CreateTemplateSetRequest {
  targetReps: number;
  targetWeight?: number;
  restTime?: number;
}

interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  exercises?: UpdateTemplateExerciseRequest[];
  tags?: string[];
}

interface UpdateTemplateExerciseRequest {
  id?: string;
  exerciseId: string;
  sets: UpdateTemplateSetRequest[];
  notes?: string;
  order?: number;
}

interface UpdateTemplateSetRequest {
  id?: string;
  targetReps: number;
  targetWeight?: number;
  restTime?: number;
}
```

## Analytics Service Contract

### Interface Definition
```typescript
interface IAnalyticsService {
  // Personal Records
  calculatePersonalRecords(exerciseId: string): Promise<PersonalRecord[]>;
  getPersonalRecords(exerciseId?: string): Promise<PersonalRecord[]>;
  checkForNewPRs(workoutId: string): Promise<PersonalRecord[]>;
  
  // Progress Analytics
  getProgressData(exerciseId: string, timeframe: TimeFrame): Promise<ProgressData>;
  getVolumeProgression(timeframe: TimeFrame): Promise<VolumeProgressionData>;
  getWorkoutFrequency(timeframe: TimeFrame): Promise<FrequencyData>;
  
  // Weekly Recaps
  getWeeklyRecap(week: Date): Promise<WeeklyRecap>;
  compareWeeks(week1: Date, week2: Date): Promise<WeekComparison>;
  getRollingAverages(weeks: number): Promise<RollingAverageData>;
  
  // Statistics
  getWorkoutStats(timeframe?: TimeFrame): Promise<WorkoutStats>;
  getExerciseStats(exerciseId: string, timeframe?: TimeFrame): Promise<ExerciseStats>;
}

interface ProgressData {
  exerciseId: string;
  exerciseName: string;
  dataPoints: {
    date: Date;
    weight: number;
    volume: number;
    estimatedMax: number;
  }[];
  trend: 'increasing' | 'decreasing' | 'stable';
  improvement: number; // percentage change
}

interface VolumeProgressionData {
  totalVolume: {
    date: Date;
    volume: number;
  }[];
  exerciseBreakdown: {
    exerciseId: string;
    exerciseName: string;
    volume: number;
    percentage: number;
  }[];
}

interface WeeklyRecap {
  week: Date;
  workoutsCompleted: number;
  workoutsPlanned: number;
  totalVolume: number;
  newPRs: PersonalRecord[];
  topExercises: {
    exerciseId: string;
    exerciseName: string;
    volume: number;
  }[];
  consistency: number; // percentage of planned workouts completed
}

interface TimeFrame {
  startDate: Date;
  endDate: Date;
}

enum TimeFramePreset {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  ALL_TIME = 'all_time'
}
```

## Program Service Contract

### Interface Definition
```typescript
interface IProgramService {
  // Program CRUD operations
  createProgram(program: CreateProgramRequest): Promise<Program>;
  getProgram(id: string): Promise<Program | null>;
  getAllPrograms(): Promise<Program[]>;
  updateProgram(id: string, updates: UpdateProgramRequest): Promise<Program>;
  deleteProgram(id: string): Promise<void>;
  
  // Program management
  startProgram(programId: string): Promise<Program>;
  pauseProgram(programId: string): Promise<Program>;
  restartProgram(programId: string): Promise<Program>;
  advanceProgram(programId: string): Promise<Program>;
  
  // Program queries
  getActiveProgram(): Promise<Program | null>;
  getCurrentWorkout(): Promise<Template | null>;
  getNextWorkout(): Promise<Template | null>;
  getProgramHistory(programId: string): Promise<ProgramHistory>;
}

interface CreateProgramRequest {
  name: string;
  description?: string;
  weeks: CreateProgramWeekRequest[];
}

interface CreateProgramWeekRequest {
  weekNumber: number;
  days: CreateProgramDayRequest[];
}

interface CreateProgramDayRequest {
  dayNumber: number;
  name: string;
  templateId?: string;
  isRestDay: boolean;
}

interface ProgramHistory {
  programId: string;
  programName: string;
  completedCycles: number;
  currentCycle: number;
  startDate: Date;
  completedWorkouts: Workout[];
  missedSessions: Date[];
}
```

## Storage Service Contract

### Interface Definition
```typescript
interface IStorageService {
  // Data persistence
  save<T>(key: string, data: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  
  // Bulk operations
  saveBatch(items: { key: string; data: any }[]): Promise<void>;
  loadBatch(keys: string[]): Promise<{ [key: string]: any }>;
  
  // Query operations
  query<T>(storeName: string, predicate: (item: T) => boolean): Promise<T[]>;
  
  // Metadata
  getStorageInfo(): Promise<StorageInfo>;
}

interface StorageInfo {
  totalSize: number;
  usedSize: number;
  isNearLimit: boolean;
  supportsLargeObjects: boolean;
}
```

## Export Service Contract

### Interface Definition
```typescript
interface IExportService {
  // Data export
  exportToJSON(options: ExportOptions): Promise<string>;
  exportToCSV(options: CSVExportOptions): Promise<string>;
  
  // Data import
  importFromJSON(jsonData: string): Promise<ImportResult>;
  validateImportData(jsonData: string): Promise<ValidationResult>;
  
  // Backup and restore
  createBackup(): Promise<string>;
  restoreFromBackup(backupData: string): Promise<RestoreResult>;
}

interface ExportOptions {
  includeWorkouts?: boolean;
  includeExercises?: boolean;
  includeTemplates?: boolean;
  includePrograms?: boolean;
  includePersonalRecords?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

interface CSVExportOptions {
  type: 'workouts' | 'exercises' | 'personal-records';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

interface ImportResult {
  success: boolean;
  importedCounts: {
    workouts: number;
    exercises: number;
    templates: number;
    programs: number;
    personalRecords: number;
  };
  errors: string[];
  warnings: string[];
}

interface ValidationResult {
  isValid: boolean;
  version: string;
  errors: string[];
  warnings: string[];
}
```

## Error Handling

### Service Error Types
```typescript
class ServiceError extends Error {
  constructor(
    message: string,
    public code: ServiceErrorCode,
    public context?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

enum ServiceErrorCode {
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  DUPLICATE_EXERCISE_NAME = 'DUPLICATE_EXERCISE_NAME',
  
  // Data errors
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  
  // Storage errors
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  
  // Business logic errors
  WORKOUT_ALREADY_COMPLETED = 'WORKOUT_ALREADY_COMPLETED',
  PROGRAM_CONFLICT = 'PROGRAM_CONFLICT',
  
  // Export/Import errors
  INVALID_EXPORT_FORMAT = 'INVALID_EXPORT_FORMAT',
  INCOMPATIBLE_DATA_VERSION = 'INCOMPATIBLE_DATA_VERSION'
}
```

This service contract specification provides a comprehensive API design for the frontend application, ensuring clean separation of concerns and testable interfaces.