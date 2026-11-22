# 0025 — Prototype cleanup workflow: the platform's template, as violin has it

- Date: 2026-11-21 · Status: agent-decided (orchestrated worker session; follows the first workout prototype, PR #57, getting a preview)
- Affects: `.github/workflows/preview-cleanup.yml` (new)
- Reversibility: easy. Delete the workflow; nothing else depends on it. Deployments it recorded stay as history.

## Context
A Product Scout prototype is a pull request labelled `prototype` with a preview on app-platform. The platform
removes an expired or closed preview from the cluster but can't write to this repository, so the app runs
its own cleanup job: close the PR, delete its branch and its images on ghcr.io, and mark its GitHub
deployment inactive (eklavyamirani/app-platform record 0059). `scripts/new-app` generates it from
`templates/new-app/preview-cleanup.yml`; workout predates that template, and PR #57 is its first prototype
with a live preview (`workout-pr-57`). The `prototype` and `prototype: discarded` labels now exist here.

## Decision
Add the template unchanged apart from the app's values, substituted exactly as `scripts/new-app` does
(`envsubst` of `NAME`, `STATUS_URL`, `PREVIEW_IMAGES`): app `workout`, the public status endpoint
`https://previews.app.ekkylab.uk/api/status`, images `workout-web workout-api workout-db` (the three
`platform-v2-images.yml` pushes, tagged with the commit). The result is violin's file with violin's names
swapped for workout's. Triggers: push to `main`, a 30-minute schedule (best effort) and
`workflow_dispatch` (with `dry_run`); no `pull_request` or `pull_request_target` trigger, since the job
can write and the repository is public. It uses only this repository's `GITHUB_TOKEN`, with no Azure or
cluster access.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: the template as generated** | Same job as violin; re-syncable by diff against the template | Workflow file names differ from the platform's expectation for the image workflow (`platform-v2-images.yml`), handled on the platform side |
| Write a workout-specific job | Could cover the older preview workflows too | Drifts from the platform's flow; nothing needs it |
| No job; clean up by hand | No write-capable scheduled job | Expired prototypes leave open PRs, branches and images behind |

## Revisit if
The template changes in app-platform (re-generate and diff); the image list in `platform-v2-images.yml`
changes; the job can't delete package versions with the repository token (packages not linked to this
repository).

## Review
