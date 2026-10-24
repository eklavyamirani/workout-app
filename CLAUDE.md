# Agent instructions — workout-app

This app is a reference app of the app platform
(`eklavyamirani/app-platform`, `docs/design.md`). Platform adoption work
follows that doc's §0 process rules; read §0, §5.1, §6a, §6b.1, §7 and §12
before starting. Do not edit the platform repo from here: contract changes
go in the PR (and a `docs/handoff/` note when work is handed over).

## Working principle (mandatory)

- Drive to the goal. When blocked on a choice, decide and continue.
- Record every non-trivial decision in `docs/decisions/NNNN-<slug>.md`
  (template: platform `docs/design.md` §0), in the same commit as the
  change, and add a row to `docs/decisions/README.md`.
- Stop only for the platform §0 stop-list (irreversible data loss,
  weakening isolation/security, secrets or spending, force-push or pushes
  to a default branch, actions outside the repos in scope).

## Toolchain

- `mise install` provides the pinned .NET SDK (`mise.toml`). Use mise; do
  not install competing version managers.
- `dotnet test server/server.Tests` needs a Docker daemon (Testcontainers).
  On macOS: `colima start` (colima and docker-cli come from mise).

## Contract reminders

- Per-request DB context is transaction-local only (`set_config(..., true)`
  inside the request transaction): the platform pools in transaction mode.
- Never `CREATE ROLE` in migrations; the platform owns roles. Grants go to
  `DATABASE_RUNTIME_ROLE`.
- Users are keyed by `(issuer, subject)`; Pocket ID access tokens carry no
  `email` claim.
