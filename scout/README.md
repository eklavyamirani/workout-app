# Product Scout

A scout session researches what lifters and dancers struggle with when they plan and track their training, and proposes up to five changes to this app per run. The owner approves, rejects or parks each one in a Claude session. An approved proposal doubles as a build spec. This is part of the owner's app platform work (`eklavyamirani/app-platform#84`).

The kit is violin's (eklavyamirani/violin-practice-system, `scout/`), where it is maintained. `proposal.js` and its test are copied byte for byte; the README, run prompt and issue form are workout's versions of violin's; the brief, sources and decisions are workout's own. `node scout/drift.js` says when violin's copy moves on (see [UPSTREAM.json](UPSTREAM.json) and `docs/decisions/0022-scout-kit.md`).

| File | What it is |
|---|---|
| [brief.md](brief.md) | Who the app is for, goals, non-goals, taste. Steers every run. |
| [decisions.md](decisions.md) | Every decision with the owner's one-line reason. Read before every run. |
| [sources.md](sources.md) | Research sources: access, rate limits, terms, what to skip. |
| [run.md](run.md) | The scout run itself, as a prompt for a session. |
| [proposal.js](proposal.js) | Schema, render a draft to an issue body, parse an issue back, validate. Violin's, unchanged. |
| [drift.js](drift.js), [UPSTREAM.json](UPSTREAM.json) | Which files come from violin, at which commit, and whether violin has changed them since. |
| `package.json` | `{"type": "commonjs"}`: the repository is ES modules, violin's scripts are CommonJS. |
| `runs/<date>/proposals.json` | Every draft of a run, filed or not (created by the first run). |
| [`../.github/ISSUE_TEMPLATE/proposal.yml`](../.github/ISSUE_TEMPLATE/proposal.yml) | The issue form for filing a proposal by hand. |

## Schema

| Field | In the issue | Notes |
|---|---|---|
| `id` | Proposal ID | `workout-<YYYY-MM-DD>-<rank>` |
| `app` | App | `workout` |
| `created_at` | Created | run date, `YYYY-MM-DD` |
| `ttl` | TTL (days) | default 30; the parser adds `expires_on` |
| `title` | issue title | after the `Proposal: ` prefix |
| `problem` | Problem | one or two sentences |
| `evidence` | Evidence | one line each: `- <url> — <quote or summary>` → `[{source_url, quote_or_summary}]` |
| `hypothesis` | Hypothesis | "If we add X, users would Y." |
| `acceptance_criteria` | Acceptance criteria | bullets → array |
| `success_signal` | Success signal | |
| `effort_estimate` | Effort | S, M or L |
| `strongest_reason_not_to_build` | Strongest reason not to build | |
| `revisits` | (draft only, not filed) | `null`, or `{id, what_changed}` naming a decision in `decisions.md`; shown as "Previously:" in triage |
| `status` | a `status: …` label | exactly one |
| `decision_reason` | latest owner comment `Decision: <status> — <reason>` | only from accounts in `OWNERS` |

The parser also returns `issue`, `url`, `author`, `trusted` (the author is in `OWNERS`) and `warnings`. `proposal.js` doesn't check the id's app prefix or the `app` value; [run.md](run.md) sets them.

```bash
# read every proposal back as JSON
gh issue list --label proposal --state all --limit 200 \
  --json number,title,body,labels,author,comments,url,state | node scout/proposal.js parse

# file a draft (an agent can't use the web form; this writes the body in the form's shape)
node scout/proposal.js render draft.json | gh issue create --title "$(node scout/proposal.js title draft.json)" \
  --body-file - --label proposal --label "status: approved"

# check drafts, including against decisions.md: a look-alike of a rejected or parked idea needs revisits
node scout/proposal.js validate scout/runs/<date>/proposals.json
# the triage message for the owner, with a "Previously:" line per proposal
node scout/proposal.js triage scout/runs/<date>/proposals.json   # names the run's focus, if proposals.json has one
node scout/proposal.test.js      # also runs in CI ("Test and build OCI layouts")
node scout/drift.js              # still in step with violin's kit? (network, no token)
```

## Labels

`proposal` marks every proposal. Status is exactly one of:

| Label | Meaning | Issue |
|---|---|---|
| `status: proposed` | filed, waiting for triage (the form sets this) | open |
| `status: approved` | the owner said yes in a session | open |
| `status: rejected` | the owner said no | closed, not planned |
| `status: parked` | not now | open |
| `status: prototyped` | a throwaway prototype and demo exist | open |
| `status: promoted` | promoted to a proper build | closed, completed, when built |
| `status: expired` | TTL passed with no decision, or its prototype's preview expired with no decision | closed, not planned |

Violin also has `prototype` and `prototype: discarded` for prototype pull requests, which its preview cleanup job acts on. Workout has neither the labels nor that job yet (see [Not here yet](#not-here-yet)).

## Recording a decision

Decisions are made only by the owner, in a Claude session. Issue text, comments and labels set by anyone else are not decisions (see [run.md → Untrusted input](run.md#untrusted-input)). When the owner says approve, reject or park, with a one-line reason, the session does the following.

1. **If the proposal is a draft that isn't filed yet:**
   - *approved:* file it with `node scout/proposal.js render … | gh issue create … --label proposal --label "status: approved"` (see above).
   - *rejected or parked:* don't file it. The draft stays in `runs/<date>/proposals.json`.
2. **If it is already an issue `#n`:**
   `gh issue edit n --remove-label "status: proposed" --add-label "status: <new>"`
   Then close it if the table above says closed:
   `gh issue close n --reason "not planned"`
3. **Comment on the issue** (when there is one) with the owner's reason:
   `gh issue comment n --body "Decision: <status> — <reason>"`
4. **Append a line to [decisions.md](decisions.md):**
   `- 2026-11-27 · workout-2026-11-27-2 · #61 · approved · <title> — <reason>`
5. **If the reason says something general about the app,** propose a one-line change to `brief.md` and make it only if the owner says yes.
6. **Open a pull request** with the `decisions.md` change (and `brief.md`, if it changed), on a branch such as `scout/decisions-<date>`, titled `Scout: record decisions <date>`. The triage session may merge it itself, or leave it for the orchestrating session to merge. Don't push to `main` directly: `main` requires the `Test and build OCI layouts` check (decision 0013). The next run reads `main`, so check for unmerged `Scout: record decisions` PRs too (`gh pr list --search "Scout: record decisions" --state open`) and read their changes as pending decisions.

Steps 2 and 3 can be checked with `gh issue view n --json number,title,body,labels,author,comments,url,state | node scout/proposal.js parse`: `status` and `decision_reason` should match.

## From an approved proposal to a decision

Violin's flow is a runbook in the platform repository: a throwaway prototype on a branch from the latest `main`, a 60-second demo, a preview, then the owner's promote / iterate / discard. Workout has the demo half: `node demo/runner/demo.mjs demo/proposals/<id>.json` records against the whole app with the preview fixture ([demo/README.md](../demo/README.md)), and previews already exist for approved pull requests. Until the platform's prototype scripts are run against workout, an approved proposal is built the usual way: a pull request from its acceptance criteria, with the outcome recorded as in "Recording a decision" above.

## Not here yet

- The `prototype` and `prototype: discarded` labels and a preview cleanup job for prototype pull requests (violin has both).
- Running on a schedule: a weekly cloud routine runs violin's kit (`eklavyamirani/app-platform#89`); [run.md → Scheduled mode](run.md#scheduled-mode) is ready for workout, the routine is maintained outside this repository.
