# 0012 — Delete a logged set, with inline undo

- Date: 2026-11-01 · Status: agent-decided
- Decided by: Claude Code session (issue #36) · Affects: `src/components/SessionView.tsx`, `e2e/weight-training.spec.ts`
- Reversibility: easy. UI only; stored sets keep their shape.

## Context
#36: a set logged on the wrong exercise could not be removed. The session
view could only append sets.

## Decision
- Each logged set has a delete (trash) button, labelled "Delete set N".
  It removes the set at once, and the remaining sets are renumbered 1..n,
  so "Log Set N" stays right.
- An inline bar in the exercise card ("Deleted 55 lbs × 8 reps · Undo")
  puts the set back where it was. The bar goes away when the next set is
  logged or you switch exercises.
- Deleting every set leaves the exercise incomplete again, so Finish is
  disabled until it has a set.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: delete at once + inline undo** | One tap mid-workout; mistakes recoverable | Undo is gone after the next set |
| Confirm dialog before delete | Hard to delete by accident | Extra tap and a modal for a frequent, low-stakes fix |
| Global toast with undo | Reuses `Toast` | `Toast` renders on the home view only, not in the session |
| Edit a set in place | Fixes typos without re-logging | Bigger change; #36 is about a set on the wrong exercise |

## Why
Deleting a set mid-workout should be quick, and a mistaken delete should
be cheap to fix. Undo gives both without a modal.

## Revisit if
People want to correct weight/reps on a set: add in-place editing.

## Review
