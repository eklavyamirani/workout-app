# Brief: Workout Tracker

The scout reads this before every run. It steers what to look for and how to rank.
The owner edits it; triage decisions update it (see [decisions.md](decisions.md)).

Status: **draft, not yet confirmed by the owner** (2026-11-20). Drafted from the README, `gzclp_tracker_spec.md`, `docs/multi-program-prd.md`, the decision records and the owner's own issues in this repository.
Every line is marked: **(owner: …)** quotes or closely follows the owner's own words, with where they said it; ***(inferred)*** is the scout's reading of the repository, to be confirmed or struck by the owner.

## Who it is for

- **First: the owner**, who uses the app often (owner, 2026-11-20) to plan and track their own training: a GZCLP lifting program and ballet practice between classes (owner: #5, "my goals for the week practiced by the time I get to my next class"). ***(inferred: the mix of programs, from the README, #5 and the preview fixture)***
- An intermediate strength trainer following GZCLP who wants data-driven insights without the overhead of complex tracking (owner: `gzclp_tracker_spec.md` §1.3, written for the original app). ***(inferred: that this still describes the owner today)***
- An adult ballet student taking classes, whose class sequences change week to week (owner: #5). ***(inferred: level and class frequency unknown)***
- **Second, maybe:** other people who sign in to the deployed app, or try it anonymously in the browser. ***(inferred: the app supports both, but nothing in the repository says it is meant for anyone but the owner)***
- Not designed for: coaches managing clients, teams, or competitive athletes peaking for a meet. ***(inferred)***

## Goals

1. **Minimal interaction to plan and track.** "Require minimal interactions to plan and track my workouts" (owner: README overview); "reduce my overall planning and thought process … and just focus on following a plan" (owner: #5).
2. **Insights from the log:** "progressions, rest times, plateaus, deload time" (owner: README overview).
3. **More than one kind of training, side by side:** GZCLP, ballet, skill practice, cardio, custom, on one rolling calendar (owner: `docs/multi-program-prd.md`, built; README features).
4. **Ballet as a first-class workout,** with sequences that change by class and get tracked and analysed (owner: #5). ***(inferred: built so far: setup wizard, routine builder, glossary, practice-next notes; how it should grow is open)***
5. **Your data, offline first:** works anonymously in the browser and syncs across devices when signed in (owner: README auth modes). ***(inferred: that this is a goal, not just how it was built)***

## Non-goals

None stated by the owner yet. ***(inferred, to confirm or strike:)***

- Nutrition, body weight or body composition tracking. ***(inferred)***
- Social features, sharing or leaderboards. ***(inferred)***
- Native apps that need an install. ***(inferred: the app is a web app and the platform serves it as one)***
- Generating training or injury advice in the app. ***(inferred)***
- Violin practice: it lives in its own app now (eklavyamirani/violin-practice-system), though #5 once mentioned violin sessions here. ***(inferred)***

## Focus areas

A run can be given a focus area by the owner (`go: <focus area>`; see [run.md → Scheduled mode](run.md#scheduled-mode)). The owner's one example so far is "ballet focus in workout app" (owner, 2026-11-20). A focus steers research and ranking; it is not a goal. With `go: <focus area> keep`, the decisions pull request adds one line, `- Focus (owner, kept <date>): <focus area, in the owner's words>.`, to "What the scout should favour" below, replacing any earlier one; a plain `go` then uses it. None is kept yet.

## Taste

- Fewer taps during a workout: prefill from the last set, one tap to log, skip and undo inline (records 0012, 0016 and 0019; 0012 answers the owner's #36). ***(inferred: that these records show a lasting preference)***
- Decisions are recorded with alternatives (`docs/decisions/`), and every change is tested: Playwright end to end, xUnit against real Postgres. ***(inferred)***
- Prefer a separate sub-app that talks to the main app through a common import/export format over coupling the two (owner: #4, about a workout designer). ***(inferred: that this applies beyond the designer)***
- Plain numbers on screen (weights, reps, rest seconds, dates); no streak guilt or dark patterns. ***(inferred, carried over from violin's brief; not the owner's words about this app)***

## What the scout should favour

- Friction in the owner's own loop: planning the week, starting and logging a session, seeing what's next (owner: README overview, #5). ***(inferred: ranking)***
- Insights the app's data already supports: progression, stalls, rest times, deload timing, past workouts. (owner: README overview) ***(inferred: that the existing data is enough for some of them)***
- Real complaints and questions from lifters and dancers (Q&A, issues of comparable trackers) over guesses. ***(inferred, carried over from violin's brief)***

## What the scout should avoid

- Anything in Non-goals, and anything the app already does (check the README and `docs/decisions/README.md`). ***(inferred)***
- Ideas already on file as the owner's issues (#4 workout designer, #15 exercise library for ad hoc workouts, #14 accessibility): cite them, don't re-propose them. ***(inferred)***
- Ideas rejected in [decisions.md](decisions.md), unless new evidence answers the stated reason; then say so and cite the decision.
