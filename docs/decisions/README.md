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
