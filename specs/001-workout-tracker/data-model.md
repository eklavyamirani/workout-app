# Data Model: Workout Tracker Web Application

**Date**: 2026-01-03  
**Phase**: 1 - Design & Data Architecture  

## Core Entity Definitions

### Workout Entity
```typescript
interface Workout {
  id: string;              // UUIDv4
  name: string;            // User-provided or auto-generated name
  startTime: Date;         // When workout was started
  endTime?: Date;          // When workout was completed (optional for in-progress)
  isCompleted: boolean;    // Completion status
  duration?: number;       // Total workout time in seconds
  notes?: string;          // Optional workout notes
  exercises: WorkoutExercise[]; // Exercises performed in this workout
  createdAt: Date;         // Record creation timestamp
  updatedAt: Date;         // Last modification timestamp
  version: number;         // For data migration/conflict resolution
}

interface WorkoutExercise {
  exerciseId: string;      // Reference to Exercise entity
  sets: Set[];             // All sets performed for this exercise
  notes?: string;          // Exercise-specific notes for this workout
  order: number;           // Order of exercise in workout
}
```

### Exercise Entity
```typescript
interface Exercise {
  id: string;              // UUIDv4
  name: string;            // Exercise name (e.g., "Bench Press")
  category: ExerciseCategory; // Primary category
  muscleGroups: MuscleGroup[]; // Primary and secondary muscle groups
  equipment: Equipment[];   // Required equipment
  instructions?: string;    // How to perform the exercise
  isArchived: boolean;     // Soft delete flag
  isCustom: boolean;       // User-created vs. system/imported
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

enum ExerciseCategory {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  FLEXIBILITY = 'flexibility',
  PLYOMETRIC = 'plyometric',
  REHABILITATION = 'rehabilitation',
  OTHER = 'other'
}

enum MuscleGroup {
  CHEST = 'chest',
  BACK = 'back',
  SHOULDERS = 'shoulders',
  ARMS = 'arms',
  LEGS = 'legs',
  CORE = 'core',
  GLUTES = 'glutes',
  CALVES = 'calves',
  CARDIO = 'cardio',
  FULL_BODY = 'full_body'
}

enum Equipment {
  BARBELL = 'barbell',
  DUMBBELL = 'dumbbell',
  MACHINE = 'machine',
  CABLES = 'cables',
  BODYWEIGHT = 'bodyweight',
  RESISTANCE_BAND = 'resistance_band',
  KETTLEBELL = 'kettlebell',
  SUSPENSION = 'suspension',
  CARDIO_MACHINE = 'cardio_machine',
  OTHER = 'other'
}
```

### Set Entity
```typescript
interface Set {
  id: string;              // UUIDv4
  repetitions: number;     // Number of reps performed
  weight?: number;         // Weight used (in user's preferred unit)
  restTime?: number;       // Rest time after this set (seconds)
  isCompleted: boolean;    // Whether set was completed successfully
  notes?: string;          // Set-specific notes
  rpe?: number;            // Rate of Perceived Exertion (1-10)
  createdAt: Date;
  order: number;           // Order within exercise
}
```

### Template Entity
```typescript
interface Template {
  id: string;              // UUIDv4
  name: string;            // Template name (e.g., "Push Day A")
  description?: string;    // Template description
  exercises: TemplateExercise[]; // Exercises in template
  tags: string[];          // User-defined tags for organization
  isActive: boolean;       // Whether template is currently in use
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

interface TemplateExercise {
  exerciseId: string;      // Reference to Exercise entity
  sets: TemplateSet[];     // Set/rep scheme
  notes?: string;          // Exercise notes in template
  order: number;           // Order in template
}

interface TemplateSet {
  id: string;              // UUIDv4
  targetReps: number;      // Target repetitions
  targetWeight?: number;   // Target weight (optional)
  restTime?: number;       // Target rest time
  order: number;           // Order within exercise
}
```

### Program Entity
```typescript
interface Program {
  id: string;              // UUIDv4
  name: string;            // Program name (e.g., "5/3/1 for Beginners")
  description?: string;    // Program description
  weeks: ProgramWeek[];    // Weekly structure
  currentWeek: number;     // Current week (0-based)
  currentDay: number;      // Current day within week (0-based)
  isActive: boolean;       // Whether program is currently being followed
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

interface ProgramWeek {
  id: string;              // UUIDv4
  weekNumber: number;      // Week number in program (0-based)
  days: ProgramDay[];      // Days in this week
}

interface ProgramDay {
  id: string;              // UUIDv4
  dayNumber: number;       // Day number in week (0-based)
  name: string;            // Day name (e.g., "Upper Body", "Rest")
  templateId?: string;     // Reference to Template (if workout day)
  isRestDay: boolean;      // Whether this is a rest day
}
```

### Personal Record Entity
```typescript
interface PersonalRecord {
  id: string;              // UUIDv4
  exerciseId: string;      // Reference to Exercise
  recordType: PRType;      // Type of personal record
  value: number;           // Record value (weight for 1RM, volume for volume PR)
  reps?: number;           // Reps for 1RM calculation
  workoutId: string;       // Workout where PR was achieved
  achievedAt: Date;        // When PR was achieved
  notes?: string;          // Additional context
  createdAt: Date;
  version: number;
}

enum PRType {
  ONE_REP_MAX = '1rm',     // Calculated 1RM from any rep range
  VOLUME = 'volume'        // Total weight x reps in single workout
}
```

## Data Relationships

### Relationship Diagram
```
Workout ----< WorkoutExercise >---- Exercise
   |                                   ^
   |                                   |
   v                              PersonalRecord
Program >---- ProgramWeek              ^
   ^             |                     |
   |             v                     |
   |          ProgramDay               |
   |             |                     |
   |             v                     |
   +-------> Template ----< TemplateExercise
                |
                v
           TemplateSet

Set belongs to WorkoutExercise
PersonalRecord references Exercise and Workout
```

### Key Constraints
- All entities must have unique UUIDv4 identifiers
- Timestamps must be ISO 8601 format for consistent serialization
- Soft deletes used for Exercise (isArchived) and Template (isActive)
- Order fields ensure consistent UI presentation
- Version numbers enable optimistic concurrency control for future sync

## Data Storage Strategy

### LocalStorage Usage
```typescript
interface UserPreferences {
  weightUnit: 'kg' | 'lbs';
  defaultRestTime: number;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
}

// Stored as: localStorage.getItem('workout-tracker-preferences')
```

### IndexedDB Schema
```typescript
interface WorkoutTrackerDB {
  version: 1;
  stores: {
    workouts: Workout[];
    exercises: Exercise[];
    templates: Template[];
    programs: Program[];
    personalRecords: PersonalRecord[];
    metadata: {
      lastSync?: Date;
      dataVersion: string;
      userId?: string;
    };
  };
}
```

### Data Migration Strategy
```typescript
interface MigrationFunction {
  fromVersion: string;
  toVersion: string;
  migrate: (oldData: any) => any;
}

// Example migration for adding RPE to sets
const addRpeToSets: MigrationFunction = {
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  migrate: (data) => {
    // Transform old data structure to new format
    return data.map(workout => ({
      ...workout,
      exercises: workout.exercises.map(exercise => ({
        ...exercise,
        sets: exercise.sets.map(set => ({
          ...set,
          rpe: null // Add new optional field
        }))
      }))
    }));
  }
};
```

## Data Validation

### TypeScript Runtime Validation
```typescript
// Using zod for runtime type checking
import { z } from 'zod';

const WorkoutSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  startTime: z.date(),
  endTime: z.date().optional(),
  isCompleted: z.boolean(),
  duration: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
  exercises: z.array(WorkoutExerciseSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().min(1)
});
```

### Business Rules
1. **Workout Integrity**: Completed workouts must have endTime and duration
2. **Set Validation**: Sets must have positive reps, non-negative weight
3. **Template Consistency**: Template exercises must reference valid exercises
4. **Program Logic**: Active programs can't have overlapping date ranges
5. **PR Validation**: PRs must reference valid workout and exercise combinations
6. **Unique Constraints**: Exercise names must be unique per user (case-insensitive)

## Export/Import Format

### JSON Export Schema
```typescript
interface ExportData {
  version: string;          // Data schema version
  exportedAt: Date;         // Export timestamp
  userData: {
    preferences: UserPreferences;
    workouts: Workout[];
    exercises: Exercise[];
    templates: Template[];
    programs: Program[];
    personalRecords: PersonalRecord[];
  };
  metadata: {
    totalWorkouts: number;
    dateRange: {
      earliest: Date;
      latest: Date;
    };
    exerciseCount: number;
  };
}
```

This data model provides a comprehensive foundation for the workout tracking application while maintaining flexibility for future enhancements and multi-device synchronization capabilities.