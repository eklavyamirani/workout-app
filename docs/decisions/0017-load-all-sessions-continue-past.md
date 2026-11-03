# 0017 — Load all sessions; continue unfinished workouts from earlier days

- Date: 2026-11-02 · Status: owner-approved
- Decided by: Claude Code session, recommendation accepted by the owner · Affects: `src/App.tsx`, `src/storage/adapter.ts`, `src/utils/history.ts`, `src/components/RollingCalendar.tsx`
- Reversibility: easy. Loading only; no stored data changes.

## Context
Record 0014: the loader and the calendar each computed "today", the loader
in UTC, so the loader's date range hid an in-progress session and Start
overwrote it. 0014 aligned both on the local date, but the range was still
decided in two places.

A workout that runs past midnight was also stuck: at 00:10 the calendar
shows the new day, and the previous day's unfinished session appears only
under "Past workouts", where it could be viewed but not continued.

## Decision
- `loadData` loads every session (`sessionStorage.getAll()`). The calendar
  and the past workouts list choose what to show from them.
- "Past workouts" (`pastSessions`) lists started or finished sessions from
  the last 30 days, plus unfinished sessions of any age.
- An unfinished past session's row has a **Continue** button that reopens
  that session (same date key), so its sets stay on one workout.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: load all sessions, views filter** | One place decides which days are shown; nothing in storage can be hidden by a range | Loads sessions nothing shows (cheap: `getByDateRange` already read every session key and filtered) |
| Calendar passes its visible range to the loader | Loads only what's shown | Two places still have to agree; the past list and in-progress sessions need extra ranges |
| A day picker that loads one day | Can open any date | Bigger feature; logging a missed past workout is the real use and needs Start on past days |
| Continue in the workout dialog instead of the row | Fewer buttons | Two taps; the dialog is read-only today |

## Why
The load range was the root of the lost workout. Loading everything costs
the same as the range query did and removes that class of bug. Continue on
the past row covers the midnight case without a new screen.

## Revisit if
- Session counts grow enough that loading all of them is slow: then page by
  date, still from the calendar's own range.
- The owner wants to log a workout on a past day: a day picker with Start.
- Finishing an older GZCLP session after a newer one sets `lastWorkoutDay`
  back to the older day; guard it if that happens in practice.

## Review
