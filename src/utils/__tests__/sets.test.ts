import { describe, it, expect } from 'vitest';
import {
  restSeconds, rirToRpe, rpeToRir, withSetRoles, nextIsAmrap, asksEffort, missedTarget, setDetails, setLabels,
} from '../sets';
import type { SetLog } from '../../types';

const set = (overrides: Partial<SetLog> = {}): SetLog => ({
  id: 's', setNumber: 1, weight: 100, reps: 3, isWarmup: false, timestamp: '2026-11-06T10:00:00Z', ...overrides,
});

describe('restSeconds', () => {
  it('is the time since the previous set', () => {
    expect(restSeconds(set(), new Date('2026-11-06T10:02:05Z'))).toBe(125);
  });

  it('is undefined for the first set and after a break', () => {
    expect(restSeconds(undefined, new Date())).toBeUndefined();
    expect(restSeconds(set(), new Date('2026-11-06T10:31:00Z'))).toBeUndefined();
    expect(restSeconds(set(), new Date('2026-11-07T10:00:00Z'))).toBeUndefined();
  });
});

describe('reps in reserve', () => {
  it('maps to RPE and back, 4 meaning 4 or more', () => {
    expect([0, 1, 2, 3, 4].map(rirToRpe)).toEqual([10, 9, 8, 7, 6]);
    expect([10, 9, 8, 7, 6, 5].map(rpeToRir)).toEqual([0, 1, 2, 3, 4, 4]);
  });
});

describe('withSetRoles', () => {
  it('numbers sets and leaves sets without a tier unmarked', () => {
    const result = withSetRoles([set({ setNumber: 4 }), set({ setNumber: 9 })]);
    expect(result.map(s => s.setNumber)).toEqual([1, 2]);
    expect(result.every(s => s.isAmrap === undefined)).toBe(true);
  });

  it('marks the tier AMRAP working set, not counting warm-ups', () => {
    const sets = [set({ isWarmup: true }), set({ isWarmup: true }), ...Array.from({ length: 5 }, () => set())];
    const result = withSetRoles(sets, 'T1');
    expect(result.map(s => !!s.isAmrap)).toEqual([false, false, false, false, false, false, true]);
  });

  it('moves the AMRAP mark when an earlier set is deleted', () => {
    const t2 = withSetRoles([set(), set(), set()], 'T2');
    expect(t2[2].isAmrap).toBe(true);
    const afterDelete = withSetRoles([t2[0], t2[2]], 'T2');
    expect(afterDelete.map(s => !!s.isAmrap)).toEqual([false, false]);
  });
});

describe('nextIsAmrap', () => {
  it('is true when the next working set is the tier AMRAP set', () => {
    expect(nextIsAmrap([set(), set()], 'T2')).toBe(true);
    expect(nextIsAmrap([set(), set({ isWarmup: true })], 'T2')).toBe(false);
    expect(nextIsAmrap([set(), set()], undefined)).toBe(false);
  });
});

describe('asksEffort', () => {
  it('asks after working sets without a tier, and after the AMRAP set of a tier', () => {
    expect(asksEffort(set(), undefined)).toBe(true);
    expect(asksEffort(set({ isWarmup: true }), undefined)).toBe(false);
    expect(asksEffort(set(), 'T1')).toBe(false);
    expect(asksEffort(set({ isAmrap: true }), 'T1')).toBe(true);
  });
});

describe('setDetails', () => {
  it('lists AMRAP, a missed target, rest and reps left', () => {
    const s = set({ isAmrap: true, reps: 2, targetReps: 3, restDuration: 125, rpe: 9 });
    expect(missedTarget(s)).toBe(true);
    expect(setDetails(s)).toEqual(['AMRAP', 'target 3', 'rest 2:05', '1 rep left']);
    expect(setDetails(set({ rpe: 6 }))).toEqual(['4+ reps left']);
    expect(setDetails(set())).toEqual([]);
    expect(setDetails(s, false)).toEqual(['AMRAP', 'target 3', 'rest 2:05']);
  });
});

describe('setLabels', () => {
  it('numbers warm-ups and working sets separately', () => {
    const sets = [set({ isWarmup: true }), set({ isWarmup: true }), set(), set()];
    expect(setLabels(sets)).toEqual(['Warm-up 1', 'Warm-up 2', 'Set 1', 'Set 2']);
  });
});
