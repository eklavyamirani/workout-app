# 0020 — Platform images on ghcr.io with provenance; no Azure access; previews only when approved

- Date: 2026-11-08 · Status: agent-decided (owner: "GitHub Actions gets no access to my Azure beyond an optional ping"; previews deploy only when approved; app-platform record 0052)
- Affects: `.github/workflows/platform-v2-images.yml`, `README.md`, `docs/PLATFORM-V2.md`
- Reversibility: easy (restore the previous workflow; the platform would also need the Azure federated credential back, which was removed for pull requests).
- Supersedes the label trigger described in decision 0018.

## Context
`platform-v2-images.yml` logged in to Azure (OIDC federation) and pushed
`workout-web`/`workout-api` (and `workout-db` for PRs labelled
`preview:postgrest`) to the platform's ACR by tag.

App-platform record 0052 found two problems:
- Any same-repository PR run could obtain that login, because the label
  check lives in the workflow file the PR itself supplies.
- The login could push every app's images, and production ran mutable tags.

The platform now runs images only by a digest the owner pinned after
verifying provenance. Previews deploy only when approved with
`scripts/preview`.

## Decision
- The workflow is the platform's template (`templates/new-app`). On pushes to
  main and same-repository PRs (no label), it:
  - builds `workout-web`, `workout-api` and `workout-db`
  - pushes them to `ghcr.io/eklavyamirani/<image>:<sha>` with the job's
    `GITHUB_TOKEN` (`packages: write`)
  - attests each with `actions/attest-build-provenance` (`id-token: write`
    for Sigstore only)

  There is no Azure login and no repository variables.
- `workout-db` is built every time. `scripts/promote` and `scripts/preview`
  verify every image the app defines, variants included.
- The `preview` and `preview-closed` jobs are removed. They waited, by
  label, for the platform to create or remove a preview on its own; now the
  owner creates and removes previews, and the status page
  (`https://previews.<domain>`) shows them.
- The other ghcr.io workflows (`build-preview-images.yml`,
  `publish-preview-images.yml`, `publish-release-images.yml`,
  `ghcr.io/eklavyamirani/workout-app/*`) are unchanged.

## Alternatives
- **Use the existing `workout-app/{frontend,api}` packages.** Other image
  names; no `workout-db`; the platform chart reads `<app>-<component>`
  images.
- **Keep the readiness jobs, label-gated.** The jobs would time out on every
  PR the owner hasn't approved.

## Revisit if
The platform's preview status gains a push to GitHub deployments.
