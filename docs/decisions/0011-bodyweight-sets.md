# 0011 — Weight 0 means a bodyweight set

- Date: 2026-11-01 · Status: agent-decided
- Decided by: Claude Code session (owner request in chat: calf raises with body weight) · Affects: `src/utils/weight.ts`, `src/components/SessionView.tsx`, `src/components/GZCLPSetup.tsx`, `src/components/WorkoutPreview.tsx`
- Reversibility: easy. Stored data is unchanged (`SetLog.weight` is `0`).

## Context
"Log Set" was enabled only for weight > 0 and reps > 0. GZCLP setup also
required a starting weight above 0 for every exercise. Bodyweight
exercises (calf raises, push-ups, pull-ups) could not be logged at all.

## Decision
- A set with weight `0` is a bodyweight set. Only reps must be above 0.
- It reads as "Bodyweight" wherever a set's load is shown: the Log Set
  button ("Log Set (Bodyweight × 15 reps)") and the logged sets. A hint
  under the weight box says "0 for bodyweight".
- GZCLP setup accepts `0` as a starting weight. An empty box still blocks
  Create Program. The workout preview shows "bodyweight" for such an
  exercise.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: weight 0 = bodyweight** | No schema or setup change; works for every existing exercise | A set logged before entering a weight is recorded as bodyweight (the button label says so) |
| Per-exercise `bodyweight` flag set at program creation | Explicit; weight could mean added load ("BW + 25 lbs") | Needs a toggle in each setup flow and on existing programs; more than the request |
| A per-set "Bodyweight" toggle | Explicit per set | Same result as typing 0, with an extra control on a crowded phone layout |

## Why
The request is to be able to log bodyweight work at all. Treating 0 as
bodyweight does that with the smallest change and no data migration. The
label on the button makes an accidental 0 visible before it is logged.

## Revisit if
Weighted bodyweight movements (dips/pull-ups with a belt) need tracking:
then add a per-exercise bodyweight flag and record the weight as added load.

## Review
