# 0016 — Prefill weight and reps from the exercise's own last set

- Date: 2026-11-02 · Status: agent-decided
- Decided by: Claude Code session (owner request: switching exercises carried the previous exercise's weight) · Affects: `src/utils/history.ts`, `src/App.tsx`, `src/components/SessionView.tsx`
- Reversibility: easy.

## Context
The weight and reps boxes were one piece of state for the whole session.
Switching from squats (185) to calf raises left 185 in the box.

## Decision
Opening an exercise (on start, from a tab, or by moving on) fills weight
and reps from, in order:
1. its last set logged in this session;
2. its last set in the most recent earlier session of this program that
   logged sets for it (skipped sessions are ignored);
3. its starting weight (GZCLP setup) and its tier's target reps (GZCLP), or 0.

The earlier sessions are read from storage once, when the workout starts
(`lastSetsByActivity`). Activity ids are per program, so history doesn't
cross programs.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: the exercise's last set (this session, else last session)** | Continues where you left off; covers weight changes mid-session | After an AMRAP set, reps prefill the AMRAP count |
| First set of last session | Avoids AMRAP reps | Misses a weight increase on later sets |
| Weight only, reps unchanged | Literal reading of the request | Reps would still carry over from the previous exercise (5 → calf raises) |
| GZCLP progression (next weight from last result) | What GZCLP really wants | Needs progression rules and stage tracking; separate work |

## Why
The request is to stop the previous exercise's numbers carrying over and to
use the exercise's own history. The last set is what you most recently
lifted. Reps follow the same rule so the two boxes stay consistent.

## Revisit if
GZCLP progression is implemented: prefill should come from the next
prescribed weight and reps instead.

## Review
