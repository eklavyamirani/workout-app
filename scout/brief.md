# Brief: Workout Tracker

The scout reads this before every run. It steers what to look for and how to rank.
The owner edits it; triage decisions update it (see [decisions.md](decisions.md)).

Status: **confirmed by the owner** (2026-11-22, "All right", to five summary guesses about who the app is for, its priorities, non-goals, and what to favour and avoid). Drafted 2026-11-20 from the README, `gzclp_tracker_spec.md`, `docs/multi-program-prd.md`, the decision records and the owner's own issues in this repository; class frequency added in the owner's words on 2026-11-21.
Every line is marked: **(owner: …)** quotes or closely follows the owner's own words, with where they said it; **(owner-confirmed 2026-11-22)** was the scout's guess and the owner confirmed it; ***(inferred)*** is the scout's reading, not among what the owner confirmed, still to be confirmed or struck.

## Who it is for

- **First: the owner**, who uses the app often (owner, 2026-11-20) to plan and track their own training: a GZCLP lifting program and ballet practice between classes (owner: #5, "my goals for the week practiced by the time I get to my next class"). **(owner-confirmed 2026-11-22)**
- An intermediate strength trainer following GZCLP who wants data-driven insights without the overhead of complex tracking (owner: `gzclp_tracker_spec.md` §1.3, written for the original app). **(owner-confirmed 2026-11-22)**
- An adult ballet student taking classes, whose class sequences change week to week (owner: #5). Class frequency: "Ballet is 2 classes repeated twice a week. Contemporary is 2 classes once a week." (owner, 2026-11-21, answering the brief's questions). Contemporary is a second dance style the owner takes (owner, 2026-11-21). Practising sequences between classes **(owner-confirmed 2026-11-22)**. ***(inferred: ballet level unknown)***
- **For now, only the owner.** Other people who sign in to the deployed app, or try it anonymously in the browser, are not the audience **(owner-confirmed 2026-11-22)** (the app supports both).
- Not designed for: coaches managing clients or teams **(owner-confirmed 2026-11-22)**; competitive athletes peaking for a meet ***(inferred)***.

## Goals

In priority order: fewer taps to plan and log, then insights, then ballet growing beyond custom routines **(owner-confirmed 2026-11-22)**.

1. **Minimal interaction to plan and track.** "Require minimal interactions to plan and track my workouts" (owner: README overview); "reduce my overall planning and thought process … and just focus on following a plan" (owner: #5).
2. **Insights from the log:** "progressions, rest times, plateaus, deload time" (owner: README overview).
3. **More than one kind of training, side by side:** GZCLP, ballet, skill practice, cardio, custom, on one rolling calendar (owner: `docs/multi-program-prd.md`, built; README features).
4. **Ballet as a first-class workout,** with sequences that change by class and get tracked and analysed (owner: #5). Growing beyond custom routines is the third priority **(owner-confirmed 2026-11-22)**. Built so far: setup wizard, routine builder, glossary, practice-next notes.
5. **Your data, offline first:** works anonymously in the browser and syncs across devices when signed in (owner: README auth modes). ***(inferred: that this is a goal, not just how it was built)***

## Non-goals

All **(owner-confirmed 2026-11-22)**:

- Nutrition, body weight or body composition tracking.
- Social features, sharing or leaderboards.
- Native apps that need an install (the app is a web app and the platform serves it as one).
- Generating training or injury advice in the app.
- Violin practice: it stays in its own app (eklavyamirani/violin-practice-system), though #5 once mentioned violin sessions here.

## Focus areas

A run can be given a focus area by the owner (`go: <focus area>`; see [run.md → Scheduled mode](run.md#scheduled-mode)). The owner's one example so far is "ballet focus in workout app" (owner, 2026-11-20). A focus steers research and ranking; it is not a goal. With `go: <focus area> keep`, the decisions pull request adds one line, `- Focus (owner, kept <date>): <focus area, in the owner's words>.`, to "What the scout should favour" below, replacing any earlier one; a plain `go` then uses it. None is kept yet.

## Taste

- Fewer taps during a workout: prefill from the last set, one tap to log, skip and undo inline (records 0012, 0016 and 0019; 0012 answers the owner's #36). ***(inferred: that these records show a lasting preference)***
- Decisions are recorded with alternatives (`docs/decisions/`), and every change is tested: Playwright end to end, xUnit against real Postgres. ***(inferred)***
- Prefer a separate sub-app that talks to the main app through a common import/export format over coupling the two (owner: #4, about a workout designer). ***(inferred: that this applies beyond the designer)***
- Plain numbers on screen (weights, reps, rest seconds, dates); no streak guilt or dark patterns. ***(inferred, carried over from violin's brief; not the owner's words about this app)***

## What the scout should favour

- Friction in the owner's weekly loop: planning the week, starting and logging a session, seeing what's next (owner: README overview, #5). **(owner-confirmed 2026-11-22)**
- Carrying ballet class notes into practice. **(owner-confirmed 2026-11-22)**
- Insights the app's data already supports: progression, stalls, rest times, deload timing, past workouts. (owner: README overview) ***(inferred: that the existing data is enough for some of them)***
- Real complaints and questions from lifters and dancers (Q&A, issues of comparable trackers) over guesses. ***(inferred, carried over from violin's brief)***

## What the scout should avoid

- Cardio and GPS tracking features. **(owner-confirmed 2026-11-22)**
- Coach or team features. **(owner-confirmed 2026-11-22)**
- Proposals that decide GZCLP weights or stage changes for the lifter. ***(inferred from the owner's rejection of proposal 1 in the 2026-11-21 triage: "I can do this manually and prefer it that way.")***
- Anything in Non-goals, and anything the app already does (check the README and `docs/decisions/README.md`). ***(inferred)***
- Ideas already on file as the owner's issues (#4 workout designer, #15 exercise library for ad hoc workouts, #14 accessibility): cite them, don't re-propose them. ***(inferred)***
- Ideas rejected in [decisions.md](decisions.md), unless new evidence answers the stated reason; then say so and cite the decision.
