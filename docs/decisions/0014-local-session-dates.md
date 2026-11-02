# 0014 — Session dates are local dates; starting a workout never replaces a stored session

- Date: 2026-11-02 · Status: agent-decided
- Decided by: Claude Code session (owner report: in-progress workout lost after an update) · Affects: `src/utils/date.ts`, `src/App.tsx`, `src/components/RollingCalendar.tsx`
- Reversibility: easy for code. A session that was already overwritten is gone:
  local storage and the server keep only the latest value per key.

## Context
The owner's in-progress workout disappeared after an app update, and
they had to start it again. Cause:
- `RollingCalendar` derives session dates (and so the storage key
  `sessions:{date}:{programId}`) from the **local** date.
- `App.loadData` loaded sessions from **UTC** today
  (`new Date().toISOString()`). In PST, from 4 pm the UTC date is
  already tomorrow, so today's session was not loaded.
- The calendar card then showed **Start** instead of **Continue**.
  `handleStartSession` found nothing in memory and saved a new session
  under the same key, overwriting the in-progress one.
- Any reload in the evening triggered it. Deploys reload the app, which is
  why it showed up after an update.

Reproduced in `e2e/session-history.spec.ts` (timezone America/Los_Angeles,
5:30 pm): it fails on `38be897`.

## Decision
- `localDateString()` (local Y-M-D) is the only way to get a session date.
  `loadData`'s range and `RollingCalendar` both use it.
- `handleStartSession` checks storage when the in-memory map has no
  session for the key, and creates one only if storage has none either.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: local dates everywhere + storage check before create** | Matches what the user sees as "today"; the check protects against any future range bug | Users east of UTC had sessions stored under the previous day; those now show one day earlier |
| UTC dates everywhere | One rule | "Today" would flip at 4 pm in PST; workouts would land on the wrong day |
| Only the storage check | Smallest | In-progress sessions would still disappear from the calendar every evening |

## Why
The owner trains in the evening in a US timezone, so UTC dates are wrong
for them half the day. The storage check makes "Start" safe even if a date
is ever computed wrongly again.

## Revisit if
Sessions sync across devices in different timezones on the same day: then
keys need a stored timezone or session ids instead of dates.

## Review
