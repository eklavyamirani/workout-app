# Decision records

Agent and owner decisions for adopting the app platform. Format and rules:
platform repo `docs/design.md` §0 (record template, statuses
`agent-decided` → `accepted` | `revise` | `superseded-by NNNN`). Number
sequentially, never renumber.

| # | Date | Decision | Status |
|---|------|----------|--------|
| [0001](0001-rebuild-platform-adopt-branch.md) | 2026-10-23 | Rebuild `platform/adopt` from the design doc (old WIP never pushed) | agent-decided |
| [0002](0002-transaction-local-user-context.md) | 2026-10-23 | Per-request transaction carries the RLS user id; PgBouncer-backed tests | agent-decided |
| [0003](0003-migration-job-and-runtime-role.md) | 2026-10-23 | `--migrate` job as owner; no role DDL; grants to `DATABASE_RUNTIME_ROLE`; PG18 tests | agent-decided |
| [0004](0004-identify-users-by-issuer-and-subject.md) | 2026-10-23 | Users keyed by `(iss, sub)`; Pocket ID access tokens have no email | agent-decided |
| [0005](0005-read-config-from-runtime-contract.md) | 2026-10-23 | `DATABASE_URL`, `OIDC_*`, `PLATFORM_CA_FILE`, `PORT`; standard OIDC logout | agent-decided |
| [0006](0006-platform-manifest.md) | 2026-10-23 | `platform.toml` = §7 example + `[previews]`; scratch site stage; contract smoke script | agent-decided |
| [0007](0007-preview-seed-fixture-and-sanitize.md) | 2026-10-23 | Preview seed: SQL fixture + identity-breaking sanitizer, `--seed` jobs | agent-decided |
| [0008](0008-local-compose-stack.md) | 2026-10-23 | Compose kept for local dev, platform-shaped (migrate job, `workout_rt`, PG18); Authentik bootstrap fix | agent-decided |

## Status (2026-10-24)

Deployed on the app platform: `9d50cc0` went live on the first `git push`, with passkey
sign-in, cross-device persistence and rollback verified by Playwright
(app-platform `docs/evidence/phase-1/` on `platform/phase-1`,
eklavyamirani/app-platform#1). The adoption handoff file has been removed, as it asked.
The platform took the contract requests: §6a/§12 corrected, logout callback URLs, edge
security headers, `INHERIT FALSE, SET FALSE` runtime role.

Previews (platform phase 2, app-platform record 0008): `platform.toml` now sets the seed
hooks `fixture` and `sanitize`. A branch push builds `workout_app_seed`: migrate, then
`--seed fixture`. Each preview clones it copy-on-write, and the platform runs `REASSIGN OWNED`
to the preview's owner before the preview's `--migrate`. Verified by Playwright
(app-platform `docs/evidence/phase-2/`):
- sign-in through the preview's own client `workout-app-<env>`;
- a program written in a preview is visible neither in prod nor in another preview;
- a preview token gets 401 from prod.

## Open follow-ups

- `seed = "staging"` (prod dump + `--seed sanitize`) fails here. `user_data` has
  `FORCE ROW LEVEL SECURITY`, so the owner role cannot dump it. The platform would need a
  BYPASSRLS dump role (app-platform record 0008, owner decision). `fixture` is unaffected.
- Point this repo's `e2e/` suite at a platform URL with the WebAuthn virtual
  authenticator (today it runs against `vite dev` with mocked OIDC; the platform repo has
  its own workout-app E2E).
- Local compose: replace Authentik with Pocket ID (record 0008).
- Contract step for record 0004: `users.issuer/subject` `NOT NULL`, drop the email bridge.
- CI: the tests now pull `postgres:18.6-alpine` and `edoburu/pgbouncer:v1.26.1-p0`.
  CI publishes the nginx frontend image; the §7 prebuilt-image path would need the
  `Dockerfile.static` `site` stage.
