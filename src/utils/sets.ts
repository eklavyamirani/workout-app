import type { GZCLPTier, SetLog } from '../types';
import { GZCLP_CONFIGS } from '../types';

// A longer gap than this between two sets is a break, not rest
export const REST_BREAK_SECONDS = 30 * 60;

// Reps in reserve offered after a set; the last one means "4 or more"
export const RIR_CHOICES = [0, 1, 2, 3, 4];

// Seconds between the exercise's previous set and now; undefined for its first set or after a break
export function restSeconds(previous: SetLog | undefined, now: Date): number | undefined {
  if (!previous) return undefined;
  const seconds = Math.round((now.getTime() - new Date(previous.timestamp).getTime()) / 1000);
  if (seconds < 0 || seconds > REST_BREAK_SECONDS) return undefined;
  return seconds;
}

export function rirToRpe(rir: number): number {
  return 10 - Math.min(rir, 4);
}

export function rpeToRir(rpe: number): number {
  return Math.min(10 - rpe, 4);
}

// Numbers sets 1..n and, for a GZCLP tier, marks the working set at the tier's AMRAP
// position. Warm-ups don't count towards it, so it stays right after a delete.
export function withSetRoles(sets: SetLog[], tier?: GZCLPTier): SetLog[] {
  let working = 0;
  return sets.map((set, i) => {
    const numbered: SetLog = { ...set, setNumber: i + 1 };
    if (!tier) return numbered;
    if (!set.isWarmup) working++;
    const isAmrap = !set.isWarmup && working === GZCLP_CONFIGS[tier].amrapSet;
    return { ...numbered, isAmrap: isAmrap || undefined };
  });
}

// Whether the next working set of a tier is its AMRAP set
export function nextIsAmrap(sets: SetLog[], tier?: GZCLPTier): boolean {
  if (!tier) return false;
  return sets.filter(s => !s.isWarmup).length + 1 === GZCLP_CONFIGS[tier].amrapSet;
}

// Effort is asked after working sets without a plan, and after GZCLP's AMRAP set
export function asksEffort(set: SetLog, tier?: GZCLPTier): boolean {
  return !set.isWarmup && (!tier || !!set.isAmrap);
}

export function missedTarget(set: SetLog): boolean {
  return set.targetReps !== undefined && set.reps < set.targetReps;
}

// Display labels: warm-ups and working sets are numbered separately ("Warm-up 1", "Set 1")
export function setLabels(sets: SetLog[]): string[] {
  let warmups = 0;
  let working = 0;
  return sets.map(s => (s.isWarmup ? `Warm-up ${++warmups}` : `Set ${++working}`));
}

export function formatRest(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

// Short labels for what was logged with a set, e.g. ["AMRAP", "rest 2:05", "2 reps left"].
// Without withEffort, reps left is left out (shown as the rating buttons instead).
export function setDetails(set: SetLog, withEffort = true): string[] {
  const details: string[] = [];
  if (set.isAmrap) details.push('AMRAP');
  if (missedTarget(set)) details.push(`target ${set.targetReps}`);
  if (set.restDuration !== undefined) details.push(`rest ${formatRest(set.restDuration)}`);
  if (withEffort && set.rpe !== undefined) {
    const rir = rpeToRir(set.rpe);
    details.push(rir >= 4 ? '4+ reps left' : `${rir} ${rir === 1 ? 'rep' : 'reps'} left`);
  }
  return details;
}
