import { describe, it, expect } from 'vitest';
import { localDateString, addDays } from '../date';

describe('localDateString', () => {
  it('uses the local calendar date, not the UTC one', () => {
    // Local 23:30 on 1 Nov is 2 Nov in UTC for any zone west of UTC
    const lateEvening = new Date(2026, 10, 1, 23, 30);
    expect(localDateString(lateEvening)).toBe('2026-11-01');
    const earlyMorning = new Date(2026, 10, 2, 0, 15);
    expect(localDateString(earlyMorning)).toBe('2026-11-02');
  });

  it('pads month and day', () => {
    expect(localDateString(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('crosses month ends without mutating the input', () => {
    const start = new Date(2026, 9, 30, 12);
    expect(localDateString(addDays(start, 3))).toBe('2026-11-02');
    expect(localDateString(addDays(start, -30))).toBe('2026-09-30');
    expect(localDateString(start)).toBe('2026-10-30');
  });
});
