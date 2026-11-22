# Scout run 2026-11-21 (scheduled, workout's first)

Focus: none (no kept focus in `brief.md`; the owner replied "Both: go").

Brief: `scout/brief.md` on `main` (2426ff4), **still a draft** not confirmed by the owner. Decisions: `scout/decisions.md` on `main` (empty log); no open `Scout: record decisions` pull request. Filing mode: drafts first. Times are Pacific.

## Ranked drafts

Scores: Evidence, Fit, Leverage, Cost, Doubt, each 1–3 (run.md step 5).

| # | Proposal | E | F | L | C | D | Total | Effort |
|---|---|---|---|---|---|---|---|---|
| 1 | GZCLP works out today's weight and stage for you | 2 | 3 | 3 | 2 | 2 | 12 | M |
| 2 | Show which plates to load for the weight you're about to lift | 2 | 2 | 2 | 3 | 1 | 10 | S |

Full drafts: [proposals.json](proposals.json).

Notes on #1: the app's GZCLP tiers carry `weightIncrement` and `progressionThreshold` (`src/types/index.ts`), but nothing reads them, and record 0016 names GZCLP progression as "separate work" with a "Revisit if". Open PR #44 adds target reps and AMRAP marks that the progression rules would use; the draft says so and does not duplicate it.

## Considered and dropped

- **Ballet anything** (class combinations that change weekly, practice-next): no openable source. sources.md already says Stack Exchange is thin for ballet and there are no dance projects with issues; the Royal Academy of Dance and research pages were unreachable (see below).
- **Per-exercise progress or volume chart** (LiftLog#393, 2 thumbs-up): one source only, and PR #44 says the stall, rest and deload insights are already planned on top of its data. Better proposed after #44 lands, with the owner's own data.
- **Rest timer, warm-up sets, reps in reserve, session effort** (LiftLog#468, #555's rest-timer notification): already in open PR #44.
- **Programs that don't fit a 7-day week** (wger#848): the app already follows the GZCLP 4-day rotation (record 0010) and a rolling calendar.
- Stall / deload detection as its own proposal: folded into #1 (the stage change is GZCLP's own stall handling) and otherwise left to PR #44's planned insights.

## Sources

- **Opened:** GitHub issues through the fetch tool (github.com pages): wger-project/wger #848 and #1259, astashov/liftosaur #320 and #338, LiamMorrow/LiftLog #393, #449, #468, #555, #644. This repository: README, `docs/decisions/` (0010, 0016, the index), `src/`, PR #44's description, open issues.
- **Failed:**
  - Physical Fitness Stack Exchange API: `curl` got `CONNECT tunnel failed, response 403`; WebFetch said "unable to fetch from api.stackexchange.com". Nothing cited from it.
  - Europe PMC (`www.ebi.ac.uk`), PMC, coaching blogs, dance bodies, Hacker News: unreachable (curl failed; the fetch tool got DNS ENOTFOUND for every non-GitHub host tried this session).
  - The REST API for other repositories (`gh api repos/astashov/liftosaur/...`, `LiamMorrow/LiftLog`): 403, "GitHub access to this repository is not enabled for this session". Read through the fetch tool instead; no repository was attached.
  - Skipped per `sources.md`: Reddit, Stronger by Science, app stores, aggregators.
- **GitHub calls:** `gh issue list` failed (GraphQL is not available from these sessions); issues were read through REST (`gh api repos/.../issues`) and parsed with `proposal.js parse` (0 proposal issues).
- About 3 searches shared with the violin run, 11 GitHub issue searches, 2 fetch batches, under 15 other API calls.

## Expiry due

None. The repository has no proposal issues.

## Text that tried to instruct

None found.

## Triage (owner, in the session, 2026-11-21)

| # | Decision | Issue |
|---|---|---|
| 1 | rejected: "I can do this manually and prefer it that way." | not filed |
| 2 | approved: "Approve for demo." | #55 |

Recorded in `scout/decisions.md`. Possible brief line from the rejection (not made; asked the owner): GZCLP weights and stage changes stay the lifter's own choice.
