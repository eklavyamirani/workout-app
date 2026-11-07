# 0019 — Log rest, warm-ups, reps left, AMRAP/target reps and session effort

- Date: 2026-11-06 · Status: agent-decided
- Decided by: Claude Code session (owner request: log the data that will help improve workouts; items chosen with the owner) · Affects: `src/types/index.ts`, `src/utils/sets.ts`, `src/components/SessionView.tsx`, `src/components/WorkoutPreview.tsx`, `e2e/`
- Reversibility: easy. New optional fields in the stored JSON; old sessions stay valid.

## Context
The README's goal is insights (progressions, rest times, plateaus, deload
time) with minimal interaction. Sets stored only weight, reps and a
timestamp: `SetLog.isWarmup` was always `false`, and `isAmrap`, `rpe` and
`restDuration` were never set. Sessions had a duration but no effort.

## Decision
For every sets-reps-weight exercise, GZCLP and ad-hoc Weight Training alike:
- **Rest**: `restDuration` is the seconds since the exercise's previous set,
  stored when a set is logged. Omitted for the first set and when the gap is
  over 30 minutes (a break, or a workout continued another day). The log
  panel shows a running "Rest m:ss" clock.
- **Warm-ups**: a "Warm-up set" checkbox. It stays on for a run of warm-ups
  and resets on switching exercise. Warm-ups and working sets are numbered
  separately ("Warm-up 1", "Set 1"); `setNumber` stays the storage order.
- **Reps left in the tank** (0, 1, 2, 3, 4+), offered as buttons on the newest
  set and stored as `rpe = 10 − RIR` (4+ → 6). Tapping the chosen value clears it.
  Offered after working sets of exercises without a tier, and only after the
  AMRAP set on GZCLP, as the GZCLP spec (§5.5) asks.
- **Session effort** (1–10, `Session.effort`): Finish opens a dialog. A number
  finishes with it; "Finish without rating" and "Back to workout" are there too.
  Applies to every program type. Effort × duration gives a training load
  comparable across lifting, ballet, cardio and skill practice.

GZCLP exercises only (they have a plan to compare against):
- `targetReps` = the tier's reps, stored on working sets when logged.
  A set below it is shown in amber with "target N".
- `isAmrap` marks the working set at the tier's AMRAP position, warm-ups not
  counted. It is recomputed after a delete or undo (`withSetRoles`), so it
  follows the position. The panel says "AMRAP: as many reps as you can" before it.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: rest stored at log time** | True elapsed time, even if a set in between is deleted later | One more field per set |
| Rest derived from timestamps when read | No new field | Wrong after a delete (gap spans the deleted set); every reader re-derives |
| **Chosen: reps in reserve, stored as RPE** | RIR is easier to judge mid-workout; `rpe` already in the type and the spec | 4+ collapses everything ≤ RPE 6 |
| RPE 1–10 buttons | Full scale | Ten buttons per set; harder to judge |
| Rating on every GZCLP set | More data | A prompt after each of 5×3 sets; spec asks for AMRAP only |
| **Chosen: effort dialog on Finish** | Asked every time, one tap | One more step (skippable) |
| Optional effort field in the page | No extra step | Easy to forget; sparse data defeats load trends |
| `targetReps`/AMRAP for ad-hoc sessions | Uniform | No plan to compare to; the prefilled reps are last time's, not a target |

## Why
These are the inputs the insights in `gzclp_tracker_spec.md` §5.4–5.5 need
(rest trends, stall and failure detection, AMRAP effort, deload timing),
captured with zero or one extra tap. The insights themselves are separate work.

## Revisit if
- GZCLP stage progression (5×3 → 6×2 → 10×1) is implemented: `targetReps` and
  the AMRAP position must come from the current stage, not the tier default.
- Rest needs to include the gap when switching exercises (supersets).

## Review
