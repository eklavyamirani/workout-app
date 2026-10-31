# 0008 — Keep the compose stack for local dev, shaped like the platform

- Date: 2026-10-23 · Status: agent-decided
- Decided by: Claude Code session (workout-app adoption) · Affects: `deploy/docker-compose.yml`, `deploy/initdb/`, `deploy/README.md`, `README.md`; platform §12 item 6
- Reversibility: easy — compose and docs only. Old local volumes need
  `docker compose down -v` once.

## Context
§12 item 6: keep the existing compose/Authentik stack for local dev only.
After items 2–3 the old compose wiring no longer matches the API. It had an
admin connection, `Database__AppRolePasswordFile`, and migrations at API
startup. §12 also mentions swapping Authentik → Pocket ID locally "to match
the platform".

## Decision
- Compose stays as the local stack and is labelled so. A one-shot
  `migrate` service (same image, `--migrate`, owner `DATABASE_URL`,
  `DATABASE_RUNTIME_ROLE=workout_rt`) runs before `api`
  (`service_completed_successfully`). `api` uses `DATABASE_URL` for
  `workout_rt` plus a password file, the same shape as the platform.
- `deploy/initdb/10-runtime-role.sh` creates the NOBYPASSRLS `workout_rt`
  role from `secrets/app-role-password` on first init. It plays the
  platform's part; the app never creates roles.
- Postgres in compose moves to `18.6-alpine` (platform parity). Its volume
  mounts `/var/lib/postgresql`, because PG18 images keep data under
  `/var/lib/postgresql/18/docker`.
- Authentik stays for now. Logout goes through Authentik's standard
  `end_session_endpoint` (record 0005).
- Fix found while verifying: `authentik-worker` also gets the
  `AUTHENTIK_BOOTSTRAP_*` variables. The worker applies
  `system/bootstrap.yaml` (worker log: "Applying blueprint … path
  system/bootstrap.yaml"). Without them the admin token never existed, so
  `scripts/setup-authentik.sh` got 403 from `/api/v3/flows/instances/` even
  after 5 minutes, and `scripts/test-docker-compose.sh` failed. This bug was
  already on the base branch. Even with the variables, the token is
  accepted only ~2 minutes after a fresh start, while `/-/health/ready/`
  already says 200. So `scripts/setup-authentik.sh` now waits until
  `/api/v3/core/users/me/` accepts the token.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: keep Authentik, reshape DB/migrations like the platform** | Item 6 as written; local stack exercises the same owner/runtime split and env names | Local IdP differs from the platform's |
| Swap to Pocket ID now | Same IdP as the platform | Passkey-only sign-in needs a browser authenticator for every local login and a new setup script; larger than item 6 |
| Drop compose, develop against the platform | One stack | Platform not deployed yet; offline dev lost |

## Why
Item 6 asks to keep the stack. Making it run the same migrate/runtime
split catches contract mistakes locally, and leaving the IdP alone keeps
the change small. The Pocket ID swap is listed as follow-up work in the
handoff.

## Revisit if
The platform's Pocket ID setup becomes scriptable enough to run locally
(admin API + one-time login links): then replace Authentik.

## Review
