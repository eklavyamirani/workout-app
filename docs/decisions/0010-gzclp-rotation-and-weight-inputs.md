# 0010 — GZCLP day rotation, workout preview, decimal weight inputs

- Date: 2026-11-01 · Status: agent-decided
- Decided by: Claude Code session (issues #17–#21, parent #16) · Affects: `src/utils/gzclp.ts`, `src/utils/weight.ts`, `src/App.tsx`, `src/components/RollingCalendar.tsx`, `src/components/WorkoutPreview.tsx`, `src/components/SessionView.tsx`, `src/components/GZCLPSetup.tsx`, `src/types/index.ts`
- Reversibility: easy. One optional field is added to stored data
  (`Session.workoutDay`). Older sessions without it still load.

## Context
- #19, #20: GZCLP setup saved the 4-day plan to `gzclp:{id}:days`, but
  nothing read it. Every calendar card and every session showed every
  exercise in the program. `Program.lastWorkoutDay` existed but never
  changed.
- #18: the only way to see a day's exercises was to press Start, and that
  creates an in-progress session.
- #17: the weight inputs used `parseInt`. A controlled `type="number"` box
  also turns a half-typed `22.` back into `22`.
- #21: on a phone, the two weight/reps columns didn't fit. A flex child
  input does not shrink below its intrinsic width, so the inputs pushed the
  +/− buttons out.

## Decision
- A GZCLP session records its rotation day in `Session.workoutDay` when it
  is created. Finishing it sets `Program.lastWorkoutDay`. A date without a
  session shows the next day in the rotation (the one after
  `lastWorkoutDay`). So every open date shows the same "next" day, and it
  moves on only after a workout is finished. Skipping a date does not
  advance the rotation.
- A day's activities are its T1, T2 and T3 slots, in that order. The tier
  shown comes from the slot, not the exercise (Bench Press is T1 on day 2
  and T2 on day 1). A GZCLP program without a stored day plan (imports, the
  preview fixture) falls back to all of its activities, which is the old
  behaviour.
- Calendar cards show the day name. A Preview (eye) button opens a
  read-only dialog: the activities with tier, sets×reps, starting weight,
  duration and ballet movements. It closes with Escape or a click on the
  backdrop.
- Weights are text inputs with `inputMode="decimal"`, holding the typed
  string: digits and one decimal point, with a comma read as a point. This
  applies to the session and the GZCLP setup. Reps stay integers.
- On phones (< `sm`) the weight and reps rows stack, each with the full
  width, and the +/− buttons get larger touch targets (`p-3`). From `sm` up
  they stay side by side.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: open dates show the next rotation day** | Right whichever date you train; skipping costs nothing | Every open date shows the same day |
| Project the rotation forward one day per calendar date | Shows a sequence | Wrong as soon as you rest a day; rotation programs show every date |
| Project per scheduled weekday | Fits a fixed weekly plan | GZCLP setup uses `rotation` mode, with no weekdays |
| Weight `type="number"` + `step="any"` + `parseFloat` | Native spinner | Controlled value still loses a trailing `.`; no comma |
| Keep side-by-side inputs on phones with smaller padding | Compact | A 5-digit weight (`137.5`) was still clipped at 360 px; touch targets under 32 px |

## Why
Rotation programs are about order, not dates. Showing "your next workout
is Day N" on every open date is the only projection that stays true
whether you train tomorrow or in three days.

## Revisit if
GZCLP gets per-exercise progression (stage changes, weight increments):
then the next day and its target weights come from a progression state
rather than `lastWorkoutDay` alone. Import/export should then carry the
day plan too.

## Review
