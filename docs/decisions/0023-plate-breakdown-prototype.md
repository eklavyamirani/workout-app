# 0023 — Plate breakdown under the weight box (prototype for proposal #55)

- Date: 2026-11-21 · Status: agent-decided (the owner approved #55 "for demo" in the scout triage session)
- Affects: `src/utils/plates.ts` (new), `src/components/SessionView.tsx` (one line under the weight box), `demo/kit/walkthroughs/workout-2026-11-21-2.mjs`, `demo/proposals/workout-2026-11-21-2.json`
- Reversibility: easy. No stored data, sync format, API or schema change.

## Context
Proposal #55: between sets of a barbell lift you work out which plates go on each side. The owner approved
it for a demo. This is the throwaway prototype the demo records, not the finished feature.

## Decision
Under the weight box, for exercises whose `equipment` is `Barbell`, show the plates per side for the
current weight: "Bar 45 + 45, 25 per side", "Just the bar (45)", or, when the plates can't make it,
"Can't load with these plates: try 135 or 140". Starting defaults, not settings: a 45 lb bar and plates of
45, 35, 25, 10, 5 and 2.5 lbs. Greedy, heaviest first.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: a text line under the weight box, defaults only** | Smallest change that shows the idea; no stored data | No settings for another bar or plate set yet |
| Settings for bar and plates, synced (the proposal's criteria) | What the proposal asks for | Settings UI and sync for a prototype the owner may discard |
| A drawn bar with coloured plates | Faster to read at a glance | More UI work before the owner has seen the idea |
| A toggle per exercise for "barbell" | Covers lifts without `equipment` | GZCLP's built-in lifts already carry `equipment: Barbell` |

## Why
The demo has to show the idea working on the fixture lifter's squat; the defaults cover a standard gym.
Settings are left for promotion, if the owner promotes it.

## Revisit if
The owner promotes #55: add bar and plate settings (synced), a per-exercise barbell toggle, and an e2e spec.

## Review
