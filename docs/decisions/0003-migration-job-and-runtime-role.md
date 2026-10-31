# 0003 — Migrations as a `--migrate` job; grants to the platform's runtime role

- Date: 2026-10-23 · Status: agent-decided
- Decided by: Claude Code session (workout-app adoption) · Affects: `server/Program.cs`, `server/Data/Migrator.cs`, `server/Data/Schema.sql`, `AppDb`, tests; platform §5.1, §5.3, §6b.1, §12 item 2
- Reversibility: easy — a startup-migration flag could be re-added; no
  data shape change.

## Context
The API migrated at startup with an "admin" connection. `Schema.sql` ran
`CREATE ROLE workout_app` and the API ran `ALTER ROLE workout_app … PASSWORD`.
§5.1 forbids both: roles are cluster-global, so a role the app creates is
shared by prod and every preview. Contract v1 (§6b.1) runs `[database]
migrate` as a job with the **owner** role and `DATABASE_RUNTIME_ROLE`.
Runtime pods get only the runtime role, and migrations go through the
transaction pooler.

## Decision
- `dotnet server.dll --migrate` applies `Schema.sql` as whatever role the
  connection carries (the owner in the job) and exits. The API never
  migrates at startup and has no admin connection.
- `Schema.sql` has no role DDL. It grants to the runtime role named by
  `DATABASE_RUNTIME_ROLE` (config fallback `Database:RuntimeRole`). The name
  travels as the transaction-local setting `workout.runtime_role` and is
  quoted with `format('%I')`. A missing role fails the migration, and with no
  runtime role the grants are skipped.
- The whole migration is one transaction holding
  `pg_advisory_xact_lock`, so it is pooler-safe and concurrent jobs
  serialise. Session-level advisory locks are not supported by
  transaction-mode PgBouncer
  ([pgbouncer.org/features.html](https://www.pgbouncer.org/features.html)).
- Tests provision the database the way the platform will. They create a
  NOSUPERUSER/NOCREATEROLE owner that owns the DB and a NOBYPASSRLS `_rt`
  role, then `REVOKE CONNECT … FROM PUBLIC`. Tests use Postgres
  `18.6-alpine` to match the platform (§5). They check: migrations are
  idempotent and create no roles; the owner is unprivileged; the runtime
  role cannot disable RLS, drop the policy, drop tables or create tables; a
  missing runtime role fails; and the real `--migrate` command works as a
  process.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: `--migrate` flag on the API binary, one SQL transaction** | Matches the §7 example (`migrate = "dotnet server.dll --migrate"`, `migrate_service = "api"`); no extra image or tool; same code in tests and prod | API image contains migration code |
| Keep migrate-on-startup with an owner connection in the pod | No job needed | Runtime pods would hold owner creds (record 0002 of the platform rejects this) |
| Migration tool (DbUp, EF migrations, sqitch) | Versioned history table | New dependency; idempotent single file is enough for two tables; revisit when the schema grows |
| Template the role name into SQL text in C# | Simpler SQL | Identifier injection risk; `format('%I')` server-side avoids hand quoting |

## Why
It is least privilege for pods (§5.1), and it is exactly the contract-v1
job shape. It also stays safe under the transaction pooler. Expand/contract
(§5.3) holds because every statement is additive and idempotent.

## Revisit if
The schema needs non-idempotent changes (adopt a versioned migration tool),
or a migration needs session state (needs a session-mode pool, see platform
record 0002 "Revisit if").

## Review
