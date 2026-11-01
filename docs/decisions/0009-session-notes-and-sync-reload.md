# 0009 — Notes per exercise and per session, saved while typing; sync reloads keep the view

- Date: 2026-11-01 · Status: agent-decided
- Decided by: Claude Code session (issues #32, #33, #34) · Affects: `src/App.tsx`, `src/storage/sync.ts`, `src/components/SessionView.tsx`, `e2e/session-notes.spec.ts`
- Reversibility: easy. The stored shape is unchanged: `Session.notes` and
  `ActivityLog.notes` already existed.

## Context
- #32: signed in, every logged set sent the app back to the home page.
  The save pushes after 2 s, and `syncPush` then pulls. The pull echoes
  the session the device just pushed, `syncPull` counts that as a change
  and fires `sync:updated`, and `App.loadData()` ends with
  `setView('home')`.
- #33: session notes were written only on Finish, and routine notes only
  on "Mark as Done". Going back, or a crash, lost them. Weightlifting
  exercises had no per-exercise notes.
- #34: notes should exist per exercise, so one exercise can be analysed
  across sessions, and per session too. The session notes box should take
  half the page and be resizable.

## Decision
- `loadData()` moves from `loading` to `home` only. Background reloads
  keep the current view.
- `syncPull` skips changes whose version is not newer than the local
  meta version, so a device's own push echoed back is not a change.
  Server versions rise by one per key on every write (`SyncEndpoints`).
- Every activity type gets a notes box in the activity card ("Exercise
  notes", or "Routine notes" for ballet), stored in `ActivityLog.notes`.
  Session notes stay in `Session.notes`. Both are kept: exercise notes for
  per-exercise history, session notes for the session as a whole.
- Notes save 600 ms after the last keystroke, on Back, and as part of
  every other session save (logged set, done, finish). Drafts are merged
  into the latest saved session (`sessionRef`), so a delayed notes save
  cannot overwrite a set logged in the meantime. A notes-only exercise
  gets an `ActivityLog` without sets; completion checks are unchanged.
- Session notes box: `h-[50vh]` (min 8 rem), `resize-y`. Exercise notes:
  4 rows, `resize-y`.
- `handleUpdateSession` uses functional state updates. Saves are now more
  frequent, and a save landing after Back must not reopen the session.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: debounced save of local drafts** | No cursor jumps; storage written ≤ ~2×/s while typing | A note typed < 600 ms before the tab is killed is lost |
| Save on every keystroke through `onUpdateSession` | Nothing lost | The parent updates state after an `await`, so the controlled textarea re-renders late and the cursor jumps |
| Save on blur only | Simple | Mobile users often lock the phone without blurring; this is the #33 bug again |
| Only exercise notes, session notes derived from them | One source | #34 asks for both |

## Why
The `setView` change fixes #32 for any `sync:updated`, including real
changes from another device. The version check removes the needless
reload as well. For notes, the debounce with a merge on every save is the
smallest change that never loses a logged set and saves notes without
waiting for Finish.

## Revisit if
Notes get analytics (aggregations per exercise): then notes may need their
own keys or a server-side table instead of riding inside the session blob.

## Review
