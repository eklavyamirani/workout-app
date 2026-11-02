import type { Session, SetLog } from '../types';

// Each activity's sets from the most recent earlier session of a program that logged
// any, used to prefill the weight when switching to that exercise
export function lastSetsByActivity(
  sessions: Session[],
  programId: string,
  beforeDate: string,
): Record<string, SetLog[]> {
  const result: Record<string, SetLog[]> = {};
  const earlier = sessions
    .filter(s => s.programId === programId && s.date < beforeDate && s.status !== 'skipped')
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const session of earlier) {
    for (const log of session.activities) {
      if (!result[log.activityId] && log.sets && log.sets.length > 0) {
        result[log.activityId] = log.sets;
      }
    }
  }
  return result;
}
