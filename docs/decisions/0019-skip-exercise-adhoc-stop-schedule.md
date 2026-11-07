# 0019 — Skip an exercise; ad hoc workouts; flexible has no recurrence; stop a schedule

- Date: 2026-11-06 · Status: agent-decided
- Decided by: Claude Code session, from owner-reported issues · Affects: `src/types/index.ts`, `src/utils/schedule.ts`, `src/components/SessionView.tsx`, `src/components/RollingCalendar.tsx`, `src/components/ProgramList.tsx`, `src/components/WorkoutPreview.tsx`, `src/App.tsx`, `e2e/`
- Reversibility: easy. New optional fields only (`ActivityLog.skipped`, `ScheduleConfig.until`); old clients ignore them. No stored data is rewritten.

## Context
Owner reports (#43):
1. An exercise can't be skipped: Finish stays disabled until every exercise has a set or is done.
2. There is no way to start a workout that isn't on the schedule. The workaround was a
   Flexible ("Whenever I want") program, which the calendar showed on every one of the
   next 7 days, so the calendar filled with cards.
3. There is no way to stop a schedule so the next instances go away.

Calendar cards are computed from the schedule; only started or skipped days are stored
as sessions. So the "lot of sessions" are virtual and need no data cleanup.

## Decision
- **Skip exercise**: a Skip button on an exercise that is not done yet stores
  `ActivityLog.skipped = true` (notes kept) and opens the next exercise not done.
  Skipped counts as done for Finish. "Undo skip" clears it; logging a set or marking
  it done also clears it. The tab is struck through; workout details show "Skipped".
- **Ad hoc**: a "New workout" picker at the top of the calendar lists active programs
  and starts any of them today, scheduled or not. A day shows a program when its
  schedule puts one there *or* a session exists for that day.
  Starting a skipped day from the picker reopens it as in progress (a skip logs nothing).
- **Flexible = no recurrence**: `isScheduledOn` returns false for `flexible`. Existing
  flexible programs stop filling the calendar with no migration; they are started from
  New workout. Wizard text: "No set days: start it from New workout".
- **Stop schedule**: Programs → Stop schedule sets `schedule.until` to yesterday
  (local date). No day after `until` is scheduled; started/finished sessions stay
  visible. Resume schedule removes `until`. Not offered for flexible programs.
- Interval schedules now count local days from the creation *day* (was the creation
  timestamp with `Math.floor`, which put a program created at 22:00 off by one).
- E2E tests that used Flexible to get a card every day now use "Every 1 days".

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: flexible has no recurrence + New workout picker** | Fixes the clutter for existing programs with no migration; one ad hoc path for every schedule type | Changes what Flexible means; tests relied on it |
| Keep flexible on every day, add a "hide" per day | No meaning change | Clutter remains; hiding 7 cards a week is the problem itself |
| Show flexible only today | Less clutter | Still a daily card the owner didn't ask for; no ad hoc for weekly programs |
| Stop = delete program | Nothing new | Loses past workouts and the program for ad hoc use |
| Stop = `isActive: false` | Existing field | Hides the program everywhere (Programs list filters on it), including ad hoc and past sessions |
| Skip removes the exercise from the session | Simple | Can't tell skipped from forgotten; GZCLP day plan would change |

## Why
The root cause of the clutter was that "flexible" generated instances. Removing that
cleans every existing flexible program at once, and the picker gives the ad hoc path
the owner actually needed. `until` stops recurrence without touching history and is
undoable.

## Revisit if
- One program needs two sessions on one day: sessions are keyed `date:programId`, so
  New workout on a day that already has a finished session is disabled ("Done today").
- The owner wants to start a workout on a past day (ad hoc is today only).
- A stopped schedule should end on a chosen future date: `until` already supports it,
  only the UI is missing.

## Review
