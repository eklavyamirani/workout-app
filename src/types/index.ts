// Program Types
export type ProgramType = 'weightlifting' | 'gzclp' | 'skill' | 'cardio' | 'custom';

export interface ScheduleConfig {
  mode: 'weekly' | 'interval' | 'flexible' | 'rotation';
  daysOfWeek?: number[];  // 0-6 for weekly mode (0 = Sunday)
  intervalDays?: number;  // e.g., every 2 days
}

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  schedule: ScheduleConfig;
  isActive: boolean;
  createdAt: string;
  // GZCLP specific
  currentWeek?: number;
  lastWorkoutDay?: number;  // 1-4 for GZCLP rotation
}

// GZCLP Types
export type GZCLPTier = 'T1' | 'T2' | 'T3';

export interface GZCLPConfig {
  tier: GZCLPTier;
  sets: number;
  reps: number;
  amrapSet: number;  // which set is AMRAP (usually last)
  weightIncrement: number;
  progressionThreshold: number;
}

export const GZCLP_CONFIGS: Record<GZCLPTier, GZCLPConfig> = {
  T1: { tier: 'T1', sets: 5, reps: 3, amrapSet: 5, weightIncrement: 5, progressionThreshold: 5 },
  T2: { tier: 'T2', sets: 3, reps: 10, amrapSet: 3, weightIncrement: 5, progressionThreshold: 10 },
  T3: { tier: 'T3', sets: 3, reps: 15, amrapSet: 3, weightIncrement: 5, progressionThreshold: 25 },
};

export interface GZCLPWorkoutDay {
  dayNumber: number;  // 1-4
  name: string;  // e.g., "Day 1 - Squat Focus"
  t1ExerciseId: string;
  t2ExerciseId: string;
  t3ExerciseIds: string[];
}

// Activity Types
export type TrackingType = 'sets-reps-weight' | 'duration' | 'completion' | 'custom';

export interface CustomField {
  name: string;
  type: 'number' | 'text' | 'duration' | 'checkbox';
}

export interface Activity {
  id: string;
  name: string;
  programId: string;
  trackingType: TrackingType;
  customFields?: CustomField[];
  // For weightlifting/GZCLP
  muscleGroups?: string[];
  equipment?: string;
  tier?: GZCLPTier;
  startingWeight?: number;
  // For duration-based
  targetDuration?: number;  // minutes
}

// Default GZCLP Exercise Library
export const DEFAULT_GZCLP_EXERCISES: Omit<Activity, 'programId'>[] = [
  // T1 Exercises
  { id: 'squat', name: 'Squat', trackingType: 'sets-reps-weight', tier: 'T1', muscleGroups: ['Quads', 'Glutes'], equipment: 'Barbell' },
  { id: 'bench', name: 'Bench Press', trackingType: 'sets-reps-weight', tier: 'T1', muscleGroups: ['Chest', 'Triceps'], equipment: 'Barbell' },
  { id: 'deadlift', name: 'Deadlift', trackingType: 'sets-reps-weight', tier: 'T1', muscleGroups: ['Back', 'Hamstrings'], equipment: 'Barbell' },
  { id: 'ohp', name: 'Overhead Press', trackingType: 'sets-reps-weight', tier: 'T1', muscleGroups: ['Shoulders', 'Triceps'], equipment: 'Barbell' },
  // T2 Exercises
  { id: 'rdl', name: 'Romanian Deadlift', trackingType: 'sets-reps-weight', tier: 'T2', muscleGroups: ['Hamstrings', 'Back'], equipment: 'Barbell' },
  { id: 'incline_bench', name: 'Incline Bench Press', trackingType: 'sets-reps-weight', tier: 'T2', muscleGroups: ['Chest', 'Shoulders'], equipment: 'Barbell' },
  { id: 'bb_row', name: 'Barbell Row', trackingType: 'sets-reps-weight', tier: 'T2', muscleGroups: ['Back', 'Biceps'], equipment: 'Barbell' },
  { id: 'front_squat', name: 'Front Squat', trackingType: 'sets-reps-weight', tier: 'T2', muscleGroups: ['Quads', 'Core'], equipment: 'Barbell' },
  { id: 'close_grip_bench', name: 'Close-Grip Bench Press', trackingType: 'sets-reps-weight', tier: 'T2', muscleGroups: ['Triceps', 'Chest'], equipment: 'Barbell' },
  // T3 Exercises
  { id: 'lat_pulldown', name: 'Lat Pulldown', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Back', 'Biceps'], equipment: 'Cable' },
  { id: 'cable_fly', name: 'Cable Fly', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Chest'], equipment: 'Cable' },
  { id: 'leg_curl', name: 'Leg Curl', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Hamstrings'], equipment: 'Machine' },
  { id: 'leg_extension', name: 'Leg Extension', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Quads'], equipment: 'Machine' },
  { id: 'face_pull', name: 'Face Pull', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Shoulders', 'Back'], equipment: 'Cable' },
  { id: 'db_curl', name: 'Dumbbell Curl', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Biceps'], equipment: 'Dumbbell' },
  { id: 'tricep_pushdown', name: 'Tricep Pushdown', trackingType: 'sets-reps-weight', tier: 'T3', muscleGroups: ['Triceps'], equipment: 'Cable' },
];

// Session Tracking
export type SessionStatus = 'completed' | 'skipped' | 'partial' | 'in-progress';

export interface SetLog {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  isWarmup: boolean;
  isAmrap?: boolean;
  rpe?: number;  // 1-10 scale
  restDuration?: number;  // seconds
  timestamp: string;
}

export interface ActivityLog {
  activityId: string;
  trackingType: TrackingType;
  // For sets-reps-weight
  sets?: SetLog[];
  // For duration
  duration?: number;  // minutes
  // For completion
  completed?: boolean;
  // For custom fields
  customValues?: Record<string, string | number | boolean>;
}

export interface Session {
  id: string;
  programId: string;
  date: string;  // ISO 8601 date
  status: SessionStatus;
  startTime?: string;  // ISO 8601 datetime
  endTime?: string;
  duration?: number;  // total minutes
  activities: ActivityLog[];
  notes?: string;
  skipReason?: string;
}

// Scheduled Session (for calendar view)
export interface ScheduledSession {
  programId: string;
  programName: string;
  programType: ProgramType;
  date: string;
  activities: Activity[];
  session?: Session;  // filled if started/completed
}

// Program Export/Import
export interface ProgramExport {
  version: 1;
  exportedAt: string;
  program: Program;
  activities: Activity[];
}
