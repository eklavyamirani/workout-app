import type { Activity, ActivityLog, Session } from '../types';

// A workout idle longer than this was left open: its time ends at the last logged
// activity, not when it was finished or ended (#66)
export const IDLE_LIMIT_MINUTES = 60;

// Planned activities plus the ones the session added mid-workout (#65) or logged
// although they are not in the plan (e.g. an exercise removed from the program since)
export function withLoggedActivities(planned: Activity[], session: Session | undefined, all: Activity[]): Activity[] {
  if (!session) return planned;
  const extra = session.activities
    .filter(log => !planned.some(a => a.id === log.activityId))
    .filter(log => log.added || (log.sets?.length ?? 0) > 0 || log.completed || log.notes)
    .map(log => all.find(a => a.id === log.activityId) ?? {
      id: log.activityId,
      name: 'Removed exercise',
      programId: session.programId,
      trackingType: log.trackingType,
    });
  return [...planned, ...extra];
}

// Something was logged for the activity: sets, done, or a duration
export function hasResult(log: ActivityLog | undefined): boolean {
  return (log?.sets?.length ?? 0) > 0 || !!log?.completed;
}

// When the session last logged anything: its lastActivityAt, or the latest set
// (sessions saved before lastActivityAt existed). Undefined if nothing is known.
export function lastActivityTime(session: Session): string | undefined {
  let latest = session.lastActivityAt;
  for (const log of session.activities) {
    for (const set of log.sets ?? []) {
      if (!latest || set.timestamp > latest) latest = set.timestamp;
    }
  }
  return latest;
}

// Where a workout's time ends: now, unless it sat idle past IDLE_LIMIT_MINUTES, then
// at its last logged activity (never before it started)
export function workoutEnd(session: Session, now: Date): Date {
  const last = lastActivityTime(session);
  if (!last) return now;
  const lastMs = new Date(last).getTime();
  if (now.getTime() - lastMs <= IDLE_LIMIT_MINUTES * 60_000) return now;
  const startMs = session.startTime ? new Date(session.startTime).getTime() : lastMs;
  return new Date(Math.max(lastMs, startMs));
}

export function durationMinutes(session: Session, end: Date): number {
  if (!session.startTime) return 0;
  return Math.max(0, Math.floor((end.getTime() - new Date(session.startTime).getTime()) / 60000));
}

// An unfinished workout ended without finishing it (#66): kept as 'partial', its time
// counted to the last logged activity, not to now
export function endSession(session: Session, now: Date): Session {
  const last = lastActivityTime(session);
  const startMs = session.startTime ? Date.parse(session.startTime) : undefined;
  // Nothing logged: the workout ends where it started (0 min)
  const endMs = last ? Math.max(Date.parse(last), startMs ?? 0) : (startMs ?? now.getTime());
  const end = new Date(endMs);
  return { ...session, status: 'partial', endTime: end.toISOString(), duration: durationMinutes(session, end) };
}

// Each activity's notes from the most recent earlier session of the program that has
// any, with that session's date (#67: notes from last time)
export function lastNotesByActivity(
  sessions: Session[],
  programId: string,
  beforeDate: string,
): Record<string, { date: string; notes: string }> {
  const result: Record<string, { date: string; notes: string }> = {};
  const earlier = sessions
    .filter(s => s.programId === programId && s.date < beforeDate && s.status !== 'skipped')
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const session of earlier) {
    for (const log of session.activities) {
      if (!result[log.activityId] && log.notes?.trim()) {
        result[log.activityId] = { date: session.date, notes: log.notes };
      }
    }
  }
  return result;
}

// The latest earlier session's note for the next workout (practiceNext), with its date
export function lastNextNote(
  sessions: Session[],
  programId: string,
  beforeDate: string,
): { date: string; notes: string } | undefined {
  const latest = sessions
    .filter(s => s.programId === programId && s.date < beforeDate && s.status !== 'skipped' && s.practiceNext?.trim())
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest ? { date: latest.date, notes: latest.practiceNext! } : undefined;
}
