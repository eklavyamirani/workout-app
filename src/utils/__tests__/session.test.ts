import { describe, it, expect } from 'vitest';
import { activitiesForDay } from '../gzclp';
import {
  withLoggedActivities, lastActivityTime, workoutEnd, endSession, lastNotesByActivity, lastNextNote,
} from '../session';
import type { Activity, Session } from '../../types';

const act = (id: string, extra: Partial<Activity> = {}): Activity => ({
  id, name: id, programId: 'p', trackingType: 'sets-reps-weight', ...extra,
});

const base: Session = {
  id: 's', programId: 'p', date: '2026-11-20', status: 'in-progress',
  startTime: '2026-11-20T10:00:00.000Z', activities: [],
};

const setAt = (timestamp: string) => ({ id: timestamp, setNumber: 1, weight: 100, reps: 5, isWarmup: false, timestamp });

describe('adhoc activities (#65)', () => {
  it('are never part of a plan', () => {
    const all = [act('squat'), act('pullup', { adhoc: true })];
    expect(activitiesForDay(all, undefined).map(a => a.id)).toEqual(['squat']);
  });

  it('show in the session that added them, even with nothing logged', () => {
    const all = [act('squat'), act('pullup', { adhoc: true }), act('dips', { adhoc: true })];
    const session: Session = { ...base, activities: [{ activityId: 'pullup', trackingType: 'sets-reps-weight', added: true }] };
    expect(withLoggedActivities([all[0]], session, all).map(a => a.id)).toEqual(['squat', 'pullup']);
  });
});

describe('workout time (#66)', () => {
  it('last activity is lastActivityAt or the latest set, whichever is later', () => {
    const session: Session = {
      ...base,
      lastActivityAt: '2026-11-20T10:20:00.000Z',
      activities: [{ activityId: 'a', trackingType: 'sets-reps-weight', sets: [setAt('2026-11-20T10:30:00.000Z')] }],
    };
    expect(lastActivityTime(session)).toBe('2026-11-20T10:30:00.000Z');
  });

  it('a finish soon after the last activity ends now', () => {
    const session = { ...base, lastActivityAt: '2026-11-20T10:40:00.000Z' };
    const now = new Date('2026-11-20T11:00:00.000Z');
    expect(workoutEnd(session, now)).toEqual(now);
  });

  it('a finish after a long idle gap ends at the last activity', () => {
    const session = { ...base, lastActivityAt: '2026-11-20T10:40:00.000Z' };
    expect(workoutEnd(session, new Date('2026-11-21T09:00:00.000Z')).toISOString()).toBe('2026-11-20T10:40:00.000Z');
  });

  it('ending an abandoned workout keeps its logs and counts time to the last set', () => {
    const session: Session = {
      ...base,
      activities: [{ activityId: 'a', trackingType: 'sets-reps-weight', sets: [setAt('2026-11-20T10:45:00.000Z')] }],
    };
    const ended = endSession(session, new Date('2026-11-22T08:00:00.000Z'));
    expect(ended.status).toBe('partial');
    expect(ended.duration).toBe(45);
    expect(ended.endTime).toBe('2026-11-20T10:45:00.000Z');
    expect(ended.activities).toEqual(session.activities);
  });

  it('ending a workout that logged nothing counts 0 min', () => {
    const ended = endSession(base, new Date('2026-11-22T08:00:00.000Z'));
    expect(ended.duration).toBe(0);
    expect(ended.endTime).toBe(base.startTime);
  });
});

describe('notes from last time (#67)', () => {
  const sessions: Session[] = [
    { ...base, id: '1', date: '2026-11-10', status: 'completed', practiceNext: 'older',
      activities: [{ activityId: 'squat', trackingType: 'sets-reps-weight', notes: 'knees out' }] },
    { ...base, id: '2', date: '2026-11-15', status: 'partial', practiceNext: 'squat +5',
      activities: [{ activityId: 'squat', trackingType: 'sets-reps-weight', notes: '  ' },
        { activityId: 'bench', trackingType: 'sets-reps-weight', notes: 'pause reps' }] },
    { ...base, id: '3', date: '2026-11-18', status: 'skipped', practiceNext: 'skipped day',
      activities: [{ activityId: 'bench', trackingType: 'sets-reps-weight', notes: 'from a skip' }] },
    { ...base, id: '4', date: '2026-11-20', practiceNext: 'today',
      activities: [{ activityId: 'squat', trackingType: 'sets-reps-weight', notes: 'today' }] },
  ];

  it('takes each exercise from its latest earlier session with a note', () => {
    expect(lastNotesByActivity(sessions, 'p', '2026-11-20')).toEqual({
      squat: { date: '2026-11-10', notes: 'knees out' },
      bench: { date: '2026-11-15', notes: 'pause reps' },
    });
  });

  it('takes the note for next time from the latest earlier session, skips excluded', () => {
    expect(lastNextNote(sessions, 'p', '2026-11-20')).toEqual({ date: '2026-11-15', notes: 'squat +5' });
    expect(lastNextNote(sessions, 'other', '2026-11-20')).toBeUndefined();
  });
});
