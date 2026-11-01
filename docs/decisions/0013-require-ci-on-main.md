# 0013 — Require the CI test job on main (ruleset), so PRs can auto-merge

- Date: 2026-11-01 · Status: agent-decided (owner approved in chat)
- Decided by: Claude Code session, on the owner's go-ahead · Affects: GitHub repository settings (ruleset `main: require CI`, id 26327796); no code
- Reversibility: easy. Disable or delete the ruleset in Settings → Rules.

## Context
The owner turned on "Allow auto-merge". GitHub still refused to enable it
on PRs. `main` had no branch protection and no rulesets, so a PR with
pending checks counted as mergeable ("UNSTABLE"). GitHub only enables
auto-merge on a PR that a requirement is blocking.

## Decision
- Ruleset `main: require CI` on the default branch: the status check
  `Test and build OCI layouts` must pass, and it must come from GitHub
  Actions (integration 15368), so no other app or status can satisfy it.
  Branches don't have to be up to date before merging (`strict` off).
- Repository admins can always bypass it, so the owner can still push to
  `main` or merge in an emergency.
- The check comes from `.github/workflows/build-preview-images.yml`. It
  runs on every pull request (opened, synchronize, reopened) with no path
  filter, so docs-only PRs are not blocked forever.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: ruleset with one required check, admin bypass** | Auto-merge works; CI gates every PR | Renaming the job requires updating the ruleset |
| Classic branch protection | Same effect | Rulesets are GitHub's current mechanism and allow role bypass |
| No protection; merge by hand when green | No settings | The owner (or an agent) has to watch every PR |

## Revisit if
The CI job is renamed or split (update the required context). Also if
`platform-v2-images.yml` should gate merges too.

## Review
