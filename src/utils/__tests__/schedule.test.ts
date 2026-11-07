import { describe, it, expect } from 'vitest';
import type { Program, ScheduleConfig } from '../../types';
import { isScheduledOn, canStopSchedule, stopSchedule, resumeSchedule } from '../schedule';

function program(schedule: ScheduleConfig, createdAt = new Date(2026, 10, 1, 22, 0).toISOString()): Program {
  return { id: 'p', name: 'P', type: 'custom', schedule, isActive: true, createdAt };
}

const nov = (day: number) => new Date(2026, 10, day);

describe('isScheduledOn', () => {
  it('never schedules a flexible program', () => {
    expect(isScheduledOn(program({ mode: 'flexible' }), nov(2))).toBe(false);
  });

  it('weekly follows the days of the week', () => {
    const p = program({ mode: 'weekly', daysOfWeek: [1] }); // Mondays; 2 Nov 2026 is a Monday
    expect(isScheduledOn(p, nov(2))).toBe(true);
    expect(isScheduledOn(p, nov(3))).toBe(false);
  });

  it('interval counts local days from the creation day, whatever its time', () => {
    const p = program({ mode: 'interval', intervalDays: 2 }); // created 1 Nov 22:00
    expect(isScheduledOn(p, nov(1))).toBe(true);
    expect(isScheduledOn(p, nov(2))).toBe(false);
    expect(isScheduledOn(p, nov(3))).toBe(true);
    expect(isScheduledOn(p, new Date(2026, 9, 30))).toBe(false);
  });

  it('a stopped schedule puts nothing after its last day', () => {
    const p = program({ mode: 'rotation', until: '2026-11-05' });
    expect(isScheduledOn(p, nov(5))).toBe(true);
    expect(isScheduledOn(p, nov(6))).toBe(false);
  });
});

describe('stop and resume', () => {
  it('stop ends the schedule yesterday, across a month start', () => {
    expect(stopSchedule({ mode: 'weekly', daysOfWeek: [1] }, '2026-12-01'))
      .toEqual({ mode: 'weekly', daysOfWeek: [1], until: '2026-11-30' });
  });

  it('only a recurring, running schedule can be stopped', () => {
    expect(canStopSchedule({ mode: 'flexible' }, '2026-11-06')).toBe(false);
    expect(canStopSchedule({ mode: 'weekly' }, '2026-11-06')).toBe(true);
    expect(canStopSchedule({ mode: 'weekly', until: '2026-11-05' }, '2026-11-06')).toBe(false);
  });

  it('resume removes the end', () => {
    expect(resumeSchedule({ mode: 'interval', intervalDays: 3, until: '2026-11-05' }))
      .toEqual({ mode: 'interval', intervalDays: 3 });
  });
});
