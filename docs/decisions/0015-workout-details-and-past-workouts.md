# 0015 — View finished workouts: details dialog and a past workouts list

- Date: 2026-11-02 · Status: agent-decided
- Decided by: Claude Code session (owner request: can't view a workout once finished) · Affects: `src/App.tsx`, `src/components/RollingCalendar.tsx`, `src/components/WorkoutPreview.tsx`
- Reversibility: easy. UI only, plus a wider load range.

## Context
A finished workout's card only said "Done". The calendar starts at today,
so from the next day the workout was not shown anywhere.

## Decision
- The eye button on a started, finished or skipped card is labelled
  **View**. It opens the workout dialog (the #18 preview) and shows what
  was logged: sets per exercise, done/duration for timed activities,
  exercise notes, session notes, "practice next", status and duration.
- A **Past workouts** list under the calendar shows sessions from the last
  30 days (`HISTORY_DAYS`) that were started or finished, newest first. A
  row shows the date ("Yesterday", or the weekday and date), the program,
  the GZCLP day, and a count of exercises and sets, and opens the same
  dialog. Skipped sessions are left out of the list.
- A past session shows its recorded GZCLP day's plan plus anything else it
  logged. A session without a recorded day (older ones) shows only what it
  logged. An exercise removed from the program since shows as "Removed
  exercise".
- `loadData` loads sessions from 30 days back to 7 days ahead.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: reuse the preview dialog + a 30-day list on the home page** | One dialog for plan and results; no new navigation | Older history needs a longer range or a history page |
| A separate History tab | Room for filters and charts | New view and nav entry; more than the request |
| Re-open the finished session in SessionView, read-only | Familiar layout | SessionView is built for editing; read-only mode touches every control |

## Why
The request is to see what was done. The dialog already listed the plan,
and adding the logged results to it is the smallest change. The list keeps
finished workouts reachable after their day.

## Revisit if
Per-exercise progress over time (#34's aggregation goal) is built: that
wants a history page that reads all sessions, not 30 days.

## Review
