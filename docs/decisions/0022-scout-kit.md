# 0022 — Product Scout kit: violin's proposal.js copied with a drift check; workout's own brief, sources and run prompt

- Date: 2026-11-20 · Status: agent-decided (orchestrated worker session; the owner asked for the workout app to get its own scout, asked first before each run, with an optional focus per run)
- Affects: `scout/` (new), `.github/ISSUE_TEMPLATE/proposal.yml` (new), `.github/workflows/build-preview-images.yml` (one step), `vite.config.ts` (Vitest exclude), repository labels, `README.md`
- Reversibility: easy. Delete `scout/`, the form, the CI step, the Vitest entry and the eight labels. No app code, schema or deployment changes.

## Context
Product Scout researches problems, proposes up to five changes per run and records the owner's decisions.
The kit lives in violin (`scout/` in eklavyamirani/violin-practice-system): a run prompt, a brief, sources, a
decision log, `proposal.js` (schema, render, parse, validate, triage) with its test, an issue form and
labels. A weekly cloud routine runs it; the routine asks the owner first and takes an optional focus,
and it is maintained outside this repository. Workout is the second app to get the kit.

## Decision
1. **`proposal.js` and `proposal.test.js` are violin's, byte for byte,** pinned in `scout/UPSTREAM.json`
   (violin `a832be8`). They hold nothing app-specific: the app name and the `workout-<date>-<rank>` id
   prefix are set by `run.md`, the issue form's default and the README; `proposal.js` doesn't check them.
   So "adapt it for workout" needs no code change, and a verbatim copy keeps one implementation.
2. **`scout/package.json` says `"type": "commonjs"`.** The repository is ES modules (`"type": "module"`),
   where violin's `require`-based scripts don't run. This keeps the copy byte for byte.
3. **`node scout/drift.js`** reports the verbatim files as same / changed upstream / changed here, the
   adapted files (README, run.md, the form) as changed upstream since the pin or not, and new files in
   violin's `scout/`. Same pattern as the demo runner (0021).
4. **README, run.md and the issue form are workout's versions of violin's**: same steps and rules
   (untrusted input, drafts first, at most five proposals, about 30 calls and an hour, no Reddit,
   scheduled mode), adapted to this app's tests and sources, plus one line on a run's focus
   (`go: <focus>`). **brief.md, sources.md and decisions.md are workout's own.** The brief is a draft from
   the repository with every line marked as the owner's words or the scout's inference.
5. **The test runs in CI** as a step of `Test and build OCI layouts` (the required check, 0013), and
   Vitest excludes `scout/**` (its default pattern picks up `proposal.test.js`, as with `demo/`).
6. **Labels:** `proposal` and the seven `status: …` labels, with violin's names, colours and descriptions.
   Not `prototype` and `prototype: discarded`: violin's preview cleanup job acts on those, and workout
   has no such job yet.
7. **No `scout/runs/` yet**: the first run creates it.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: verbatim copy + `type: commonjs` + drift check** | One implementation; the copied test checks workout's own form; drift is one command | Two copies until a shared home; a change must be made in violin and copied |
| Edit the copy for workout (names in comments and test fixtures) | Reads as workout's | Nothing functional to change; the drift check could no longer tell a real divergence from a rename |
| Rename to `proposal.cjs` / convert to ESM | No extra `package.json` | No longer byte for byte; violin's docs and commands name `proposal.js` |
| Fetch `proposal.js` from violin at run time | No copy | CI and runs depend on the network and on violin's `main` at that moment; code from another repository runs unpinned |
| A shared package or repository now | One copy | Same answer as for the demo runner (0021, decided 2026-11-20): copies with drift checks until a third app needs it or it changes in a way both apps need |
| Also create the `prototype` labels | Same label set as violin | Labels with no job behind them; add them with the cleanup job |

## Why
The owner wants the scout on the app they use most, with the same process as violin. Copying the one
piece of code unchanged and writing the app-specific documents fresh gets there without forking the
logic, and the drift check keeps the copy honest.

## Revisit if
`node scout/drift.js` reports drift; a third app gets a scout (consider the shared home); the owner
confirms or rewrites the brief; workout gets the prototype flow (labels, cleanup job).

## Review
