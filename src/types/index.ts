// Program Types
export type ProgramType = 'weightlifting' | 'skill' | 'cardio' | 'custom';

export interface ScheduleConfig {
  mode: 'weekly' | 'interval' | 'flexible';
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
  // For weightlifting
  muscleGroups?: string[];
  equipment?: string;
  // For duration-based
  targetDuration?: number;  // minutes
}

// Session Tracking
export type SessionStatus = 'completed' | 'skipped' | 'partial' | 'in-progress';

export interface SetLog {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  isWarmup: boolean;
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
