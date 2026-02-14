// Program Types
export type ProgramType = 'weightlifting' | 'gzclp' | 'ballet' | 'skill' | 'cardio' | 'custom';

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

// Ballet Types
export type BalletClassType = 'full' | 'barre-only' | 'center-only' | 'pointe';
export type BalletLevel = 'beginner' | 'intermediate' | 'advanced';
export type BalletSection = 'barre' | 'center' | 'pointe' | 'cooldown';

export interface BalletExercise {
  id: string;
  name: string;
  section: BalletSection;
  defaultDuration: number; // minutes
  levels: BalletLevel[];
}

export const DEFAULT_BALLET_EXERCISES: BalletExercise[] = [
  // Barre
  { id: 'plies', name: 'Pliés', section: 'barre', defaultDuration: 5, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'tendus', name: 'Tendus', section: 'barre', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'degages', name: 'Dégagés', section: 'barre', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'rond_de_jambe', name: 'Rond de jambe', section: 'barre', defaultDuration: 5, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'fondus', name: 'Fondus', section: 'barre', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'frappes', name: 'Frappés', section: 'barre', defaultDuration: 4, levels: ['intermediate', 'advanced'] },
  { id: 'adagio_barre', name: 'Adagio (Développés)', section: 'barre', defaultDuration: 6, levels: ['intermediate', 'advanced'] },
  { id: 'grand_battement', name: 'Grand battement', section: 'barre', defaultDuration: 4, levels: ['beginner', 'intermediate', 'advanced'] },
  // Center
  { id: 'adagio_center', name: 'Adagio', section: 'center', defaultDuration: 6, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'pirouettes', name: 'Pirouettes / Turns', section: 'center', defaultDuration: 8, levels: ['intermediate', 'advanced'] },
  { id: 'petit_allegro', name: 'Petit allegro', section: 'center', defaultDuration: 8, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'grand_allegro', name: 'Grand allegro', section: 'center', defaultDuration: 8, levels: ['intermediate', 'advanced'] },
  { id: 'reverence', name: 'Révérence', section: 'center', defaultDuration: 3, levels: ['beginner', 'intermediate', 'advanced'] },
  // Pointe
  { id: 'releves_barre', name: 'Relevés at barre', section: 'pointe', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'echappes', name: 'Échappés', section: 'pointe', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'bourrees', name: 'Bourrées', section: 'pointe', defaultDuration: 5, levels: ['intermediate', 'advanced'] },
  { id: 'pointe_center', name: 'Pointe center work', section: 'pointe', defaultDuration: 10, levels: ['advanced'] },
  // Cool-down
  { id: 'floor_stretches', name: 'Floor stretches', section: 'cooldown', defaultDuration: 10, levels: ['beginner', 'intermediate', 'advanced'] },
  { id: 'cooldown', name: 'Cool-down', section: 'cooldown', defaultDuration: 5, levels: ['beginner', 'intermediate', 'advanced'] },
];

export function getBalletExercisesForClass(classType: BalletClassType, level: BalletLevel): BalletExercise[] {
  const exercises = DEFAULT_BALLET_EXERCISES.filter(e => e.levels.includes(level));

  switch (classType) {
    case 'full':
      return exercises.filter(e => e.section === 'barre' || e.section === 'center' || e.section === 'cooldown');
    case 'barre-only':
      return exercises.filter(e => e.section === 'barre' || e.section === 'cooldown');
    case 'center-only':
      return exercises.filter(e => e.section === 'center' || e.section === 'cooldown');
    case 'pointe':
      return exercises.filter(e => e.section === 'pointe' || e.section === 'cooldown');
  }
}

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
