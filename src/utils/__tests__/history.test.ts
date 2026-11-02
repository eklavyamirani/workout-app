import { describe, it, expect } from 'vitest';
import { lastSetsByActivity } from '../history';
import type { Session, SetLog } from '../../types';

const set = (weight: number, reps: number): SetLog => ({
  id: `s${weight}`, setNumber: 1, weight, reps, isWarmup: false, timestamp: '2026-01-01T00:00:00Z',
});

const session = (date: string, programId: string, logs: Record<string, SetLog[]>, status: Session['status'] = 'completed'): Session => ({
  id: `${date}-${programId}`,
  programId,
  date,
  status,
  activities: Object.entries(logs).map(([activityId, sets]) => ({ activityId, trackingType: 'sets-reps-weight', sets })),
});

describe('lastSetsByActivity', () => {
  const sessions = [
    session('2026-10-20', 'p', { squat: [set(100, 5)], bench: [set(80, 5)] }),
    session('2026-10-25', 'p', { squat: [set(105, 5)], bench: [] }),
    session('2026-10-27', 'p', { squat: [set(110, 5)] }, 'skipped'),
    session('2026-10-26', 'other', { squat: [set(200, 5)] }),
    session('2026-11-01', 'p', { squat: [set(120, 5)] }),
  ];

  it('takes each activity from its most recent earlier session with sets', () => {
    const result = lastSetsByActivity(sessions, 'p', '2026-11-01');
    expect(result.squat[0].weight).toBe(105);
    // 25 Oct logged no bench sets, so 20 Oct is used
    expect(result.bench[0].weight).toBe(80);
  });

  it('ignores other programs, skipped sessions and the current date', () => {
    const result = lastSetsByActivity(sessions, 'p', '2026-10-28');
    expect(result.squat[0].weight).toBe(105);
    expect(lastSetsByActivity(sessions, 'p', '2026-10-20')).toEqual({});
  });
});
