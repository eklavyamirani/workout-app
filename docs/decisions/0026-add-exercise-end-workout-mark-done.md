# 0026 — Add an exercise mid-workout; end abandoned workouts; mark an exercise done; notes from last time

- Date: 2026-11-22 · Status: agent-decided
- Decided by: Claude Code session, from owner issues #65, #66, #67 · Affects: `src/types/index.ts`, `src/utils/session.ts`, `src/utils/gzclp.ts`, `src/components/SessionView.tsx`, `src/components/RollingCalendar.tsx`, `src/components/WorkoutPreview.tsx`, `src/App.tsx`, `e2e/mid-session.spec.ts`
- Reversibility: easy. New optional fields only (`Activity.adhoc`, `ActivityLog.added`, `Session.lastActivityAt`); `status: 'partial'` already existed in the type. Old clients ignore the fields (an old client would show adhoc exercises in every plan). No stored data is rewritten.

## Context
- #65: no way to add an exercise during a workout. Only ballet had "Edit routines", which changes the program.
- #66: workouts left unfinished stay "Not finished" forever (record 0017). Finishing one later counted
  `now - startTime`, e.g. 24 h.
- #67: a weightlifting exercise counted as done (✓) after the first set. The owner wants an explicit
  "done" that makes it read-only, with an affordance to edit; until then it is in progress.
  Comment: see notes from the previous session and leave a note for the next one.

## Decision
- **Add exercise** (all programs except ballet, which keeps Edit routines): a dialog lists the program's
  exercises not in this workout (e.g. another GZCLP day's lift, or one added before) and creates a new one
  (name + tracking type, default by program type). The session stores `ActivityLog.added = true`, so the
  exercise is part of that workout even with nothing logged and survives Back/Continue. A new exercise is
  stored with the program's activities with `adhoc: true`: never in a plan (`activitiesForDay` drops it),
  but pickable later and prefilled from its last sets. Non-GZCLP programs offer "Also add to every future
  workout" (no `adhoc`). GZCLP plans come from day templates, so a new exercise is always adhoc there.
  An added exercise with nothing logged can be removed again.
- **End an abandoned workout**: unfinished rows under Past workouts get **End** (confirm) beside Continue.
  The session becomes `partial` ("Ended early"), keeps its logs, and its time ends at the last logged
  activity: `max(lastActivityAt, latest set timestamp)`, else 0 min. `lastActivityAt` is written on every
  save while in progress (sets, done, skip, notes). A GZCLP day that logged something advances the rotation.
- **Finish after a break**: if the last logged activity is more than 60 min (`IDLE_LIMIT_MINUTES`) before
  Finish, the time ends at that activity, not now.
- **Mark exercise done**: sets-reps-weight exercises get "Mark exercise done" once a set is logged. Done =
  `ActivityLog.completed`: sets read-only (no Log Set, no delete) under a Done bar with **Edit**, which
  clears `completed`. Tabs: done ✓ (green), sets but not done = in progress (amber, `title="In progress"`),
  skipped struck through. Timed/completion/ballet activities get the same Done bar + Edit. Finish still
  only needs a set or skip per exercise (no extra taps), and marks every exercise with sets as completed.
  Exercise notes stay editable when done.
- **Notes**: the exercise card shows "Last time · <date>" with that exercise's notes from the latest
  earlier session that had any. The ballet-only "Practice next week" becomes "Note for next workout" for
  every program (ballet keeps its labels), saved while typing like other notes (it was saved only on
  Finish), and shown at the top of the next session ("From last workout"), from completed or ended sessions.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: added exercise = adhoc activity + `added` log** | Same blob as the session (one sync key); reusable; plans unchanged | Adhoc activities accumulate in the program's list |
| Session-only activity stored inside the session | Nothing added to the program | Activity defined in two places; history/prefill code keys on program activities |
| Always add to the program | Simple | Every future workout grows; not what "mid-session" means |
| End = delete the session | Clean list | Loses logged sets (stop-list: data loss) |
| End = `completed` | No new status | Can't tell finished from abandoned |
| Auto-end after N hours | No tap | Silent status change; midnight workouts (0017) get cut |
| Duration from active time (sum of gaps < limit) | Exact | Only set timestamps exist; timed/notes activity has none |
| Mark done required for Finish | Strict | One more tap per exercise; README goal is minimal interactions |
| Read-only notes when done | Literal | Notes after the set ("felt heavy") are the main use |

## Why
Each issue is fixed with optional fields on existing records, no migration and no server change (the sync
API stores the blobs as-is). The 60 min idle limit is longer than any rest between sets and shorter than
an abandoned workout.

## Revisit if
- A workout is continued after a long break and more is logged: its time still includes the break
  (only the gap before Finish is cut).
- Adhoc exercises clutter the Add list: hide ones not used for N weeks.
- The owner wants an in-session "End early" (today the in-session path is Skip + Finish).

## Review
