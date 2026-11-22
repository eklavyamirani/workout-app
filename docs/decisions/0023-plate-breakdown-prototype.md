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
- 2026-11-21, owner (on the round-1 demo, Pacific): "Iterate: settings for the available plates configured globally."

## Round 2 (prototype, 2026-11-21)
One app-wide setting for the bar and the plate sizes, used by the plate line on every barbell lift.

- **Where it lives:** the key `settings:plates` (`{ bar, plates, updatedAt }`), through the same storage
  adapter as programs and sessions (`src/storage/plateSettings.ts`). Signed in, it syncs like any other
  key: the sync API stores any key, so no API, schema or PostgREST change. Anonymous, it stays in the
  browser. Missing or malformed values fall back to the defaults (`normalizePlateSettings`).
- **Where it's edited:** a "Plates" link next to the plate line in a workout, and a "Bar and plates" card on
  the Programs page; both open the same dialog (bar weight, toggle chips for 55–1.25 lb, any other size).
  Not in the header: it already overflows at 390 px (#48).
- **Assumptions:** lbs only (the app's only unit); plate sizes only, with as many pairs of each as needed
  (no counts: a home gym with two 45s isn't modelled yet); one bar for every barbell lift; the bar can be
  0 to 200 lbs.
- **Breakdown:** exact fewest-plates search instead of greedy. With a chosen set greedy can fail (25s and
  10s: 30 a side is 10+10+10). Nearest loadable weights still step by two of the smallest plate.
- **Tests:** `src/utils/__tests__/plates.test.ts` covers a custom bar and set, a set greedy would get
  wrong, fractional plates and the setting's normalisation. The walkthrough reads the setting back from
  the API.

| Option | Pros | Cons |
|--------|------|------|
| **Chosen: one synced key, edited from the workout and the Programs page** | Global as asked; no API change; reachable where it's needed | A second entry point to keep; no settings page to grow into |
| A settings page in the header | One obvious home for settings | The header overflows on phones already (#48) |
| Per-program or per-exercise bar | Covers a trap bar or a lighter bar for presses | Not what the owner asked; more UI |
| Plate counts per size | Right for home gyms | More UI and a harder search for a rough round |
