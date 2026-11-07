import type { Program, ScheduleConfig } from '../types';
import { localDateString } from './date';

// Whether a program's schedule puts a session on this local day. Flexible programs
// have no recurrence: their sessions are started from "New workout" (#43).
// A stopped schedule (until) puts nothing after its last day.
export function isScheduledOn(program: Program, date: Date): boolean {
  const schedule = program.schedule;
  if (schedule.until && localDateString(date) > schedule.until) return false;

  switch (schedule.mode) {
    case 'weekly':
      return schedule.daysOfWeek?.includes(date.getDay()) ?? false;
    case 'rotation':
      // GZCLP: every day offers the next workout of the rotation
      return true;
    case 'interval': {
      const created = new Date(program.createdAt);
      created.setHours(0, 0, 0, 0);
      const day = new Date(date);
      day.setHours(0, 0, 0, 0);
      const daysDiff = Math.round((day.getTime() - created.getTime()) / 86_400_000);
      return daysDiff >= 0 && daysDiff % (schedule.intervalDays || 1) === 0;
    }
    case 'flexible':
    default:
      return false;
  }
}

// Programs whose schedule can be stopped: one that recurs and is not stopped yet
export function canStopSchedule(schedule: ScheduleConfig, today: string): boolean {
  if (schedule.mode === 'flexible') return false;
  return !schedule.until || schedule.until >= today;
}

// Stops recurrence from today on: the last scheduled day becomes yesterday.
// Sessions already started or finished are kept and still shown.
export function stopSchedule(schedule: ScheduleConfig, today: string): ScheduleConfig {
  const [y, m, d] = today.split('-').map(Number);
  return { ...schedule, until: localDateString(new Date(y, m - 1, d - 1)) };
}

export function resumeSchedule(schedule: ScheduleConfig): ScheduleConfig {
  const { until: _until, ...rest } = schedule;
  return rest;
}
