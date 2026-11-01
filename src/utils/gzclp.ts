import type { Activity, GZCLPTier, GZCLPWorkoutDay, Program, Session } from '../types';

export function gzclpDaysKey(programId: string): string {
  return `gzclp:${programId}:days`;
}

// The rotation day a new session starts on: the one after the last completed day
export function nextWorkoutDay(program: Program, days: GZCLPWorkoutDay[]): GZCLPWorkoutDay | undefined {
  if (days.length === 0) return undefined;
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const last = program.lastWorkoutDay ?? 0;
  return sorted.find(d => d.dayNumber > last) ?? sorted[0];
}

// The day a session is on: the one it was started with, else the next in the rotation
export function workoutDayFor(
  program: Program,
  days: GZCLPWorkoutDay[],
  session?: Session,
): GZCLPWorkoutDay | undefined {
  if (session?.workoutDay !== undefined) {
    const day = days.find(d => d.dayNumber === session.workoutDay);
    if (day) return day;
  }
  return nextWorkoutDay(program, days);
}

// The day's exercises in T1, T2, T3 order; all activities when the day is unknown.
// The tier comes from the day's slot: a T1 lift can be another day's T2.
export function activitiesForDay(activities: Activity[], day?: GZCLPWorkoutDay): Activity[] {
  if (!day) return activities;
  const slots: [string, GZCLPTier][] = [
    [day.t1ExerciseId, 'T1'],
    [day.t2ExerciseId, 'T2'],
    ...day.t3ExerciseIds.map((id): [string, GZCLPTier] => [id, 'T3']),
  ];
  const result: Activity[] = [];
  for (const [id, tier] of slots) {
    const activity = activities.find(a => a.id === id);
    if (activity) result.push({ ...activity, tier });
  }
  return result.length > 0 ? result : activities;
}
