import { describe, it, expect } from 'vitest';
import { nextWorkoutDay, workoutDayFor, activitiesForDay } from '../gzclp';
import type { Activity, GZCLPWorkoutDay, Program, Session } from '../../types';

const program = (lastWorkoutDay?: number): Program => ({
  id: 'p',
  name: 'GZCLP',
  type: 'gzclp',
  schedule: { mode: 'rotation' },
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  lastWorkoutDay,
});

const days: GZCLPWorkoutDay[] = [
  { dayNumber: 2, name: 'Day 2', t1ExerciseId: 'p_bench', t2ExerciseId: 'p_rdl', t3ExerciseIds: ['p_curl'] },
  { dayNumber: 1, name: 'Day 1', t1ExerciseId: 'p_squat', t2ExerciseId: 'p_bench', t3ExerciseIds: ['p_pulldown', 'p_curl'] },
  { dayNumber: 3, name: 'Day 3', t1ExerciseId: 'p_deadlift', t2ExerciseId: 'p_ohp', t3ExerciseIds: [] },
  { dayNumber: 4, name: 'Day 4', t1ExerciseId: 'p_ohp', t2ExerciseId: 'p_squat', t3ExerciseIds: [] },
];

const activity = (id: string): Activity => ({ id, name: id, programId: 'p', trackingType: 'sets-reps-weight' });
const activities = ['p_squat', 'p_bench', 'p_deadlift', 'p_ohp', 'p_rdl', 'p_pulldown', 'p_curl'].map(activity);

const session = (workoutDay?: number): Session => ({
  id: 's', programId: 'p', date: '2026-11-02', status: 'in-progress', activities: [], workoutDay,
});

describe('nextWorkoutDay', () => {
  it('starts a new program on day 1', () => {
    expect(nextWorkoutDay(program(0), days)?.dayNumber).toBe(1);
    expect(nextWorkoutDay(program(undefined), days)?.dayNumber).toBe(1);
  });

  it('advances after the last completed day and wraps after day 4', () => {
    expect(nextWorkoutDay(program(1), days)?.dayNumber).toBe(2);
    expect(nextWorkoutDay(program(3), days)?.dayNumber).toBe(4);
    expect(nextWorkoutDay(program(4), days)?.dayNumber).toBe(1);
  });

  it('returns undefined without days', () => {
    expect(nextWorkoutDay(program(0), [])).toBeUndefined();
  });
});

describe('workoutDayFor', () => {
  it('keeps the day a session was started with', () => {
    expect(workoutDayFor(program(3), days, session(2))?.dayNumber).toBe(2);
  });

  it('uses the next day for a date without a session', () => {
    expect(workoutDayFor(program(3), days, undefined)?.dayNumber).toBe(4);
    expect(workoutDayFor(program(3), days, session(undefined))?.dayNumber).toBe(4);
  });
});

describe('activitiesForDay', () => {
  it('returns the day exercises in T1, T2, T3 order', () => {
    expect(activitiesForDay(activities, days[1]).map(a => a.id)).toEqual(['p_squat', 'p_bench', 'p_pulldown', 'p_curl']);
  });

  it('takes the tier from the slot on that day', () => {
    expect(activitiesForDay(activities, days[1]).map(a => a.tier)).toEqual(['T1', 'T2', 'T3', 'T3']);
    expect(activitiesForDay(activities, days[0]).map(a => a.tier)).toEqual(['T1', 'T2', 'T3']);
  });

  it('falls back to all activities without a day or matching exercises', () => {
    expect(activitiesForDay(activities, undefined)).toBe(activities);
    const unknown = { ...days[0], t1ExerciseId: 'x', t2ExerciseId: 'y', t3ExerciseIds: [] };
    expect(activitiesForDay(activities, unknown)).toBe(activities);
  });
});
