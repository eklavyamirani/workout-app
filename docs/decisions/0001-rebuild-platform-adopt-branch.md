# 0001 — Rebuild `platform/adopt` from the design doc

- Date: 2026-10-23 · Status: agent-decided
- Decided by: Claude Code session (workout-app adoption, physical Mac) · Affects: branch `platform/adopt`, draft PR
- Reversibility: easy — if the virtual Mac's work-in-progress turns up, it
  can be compared against this branch and cherry-picked; nothing was
  overwritten (no force-push).

## Context
The platform handoff (`app-platform` `docs/handoff/phase-1.md`, commit
`d88b032`) says adoption work-in-progress lives on `platform/adopt` of
`eklavyamirani/workout-app` with a draft PR into
`claude/design-persistence-system-34lxX` and a handoff file
`docs/handoff/platform-adopt.md`. On 2026-10-23 none of that existed on
GitHub: `git ls-remote` shows no `platform/adopt` ref, no open or closed PR
targets that base other than #26 (merged), and there are no forks. The
virtual Mac that held the work is not reachable from this machine. The
owner's instruction is to finish the adoption on this Mac without waiting.

## Decision
Create `platform/adopt` fresh from `claude/design-persistence-system-34lxX`
(`6c4d38b`) and do work items 1–6 of platform design §12 from scratch,
with a new draft PR into the same base.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: rebuild from the design doc** | Unblocks now; §12 lists the work items precisely | May duplicate unpushed work from the virtual Mac |
| Wait for the owner to push the virtual Mac's branch | No duplication | Stalls (§0.1 says do not wait); owner moved everything to this Mac |
| Use a different branch name to avoid a future clash | No chance of colliding with a late push | Platform session and handoff expect `platform/adopt` |

## Why
§0.1 bias to the goal. The work items are small and fully specified, so
redoing them costs less than waiting. A late push of the old branch would be
rejected as non-fast-forward rather than overwrite anything.

## Revisit if
The virtual Mac's branch is recovered: diff it against this branch and keep
whichever choices are better, with superseding records.

## Review
