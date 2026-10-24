# workout-app platform adoption — handoff

Written 2026-10-23 on the owner's physical Mac (one machine for everything).
Branch `platform/adopt` off `claude/design-persistence-system-34lxX`, draft PR
https://github.com/eklavyamirani/workout-app/pull/29. Platform design:
`eklavyamirani/app-platform` `docs/design.md` (§0 rules, §6b.1 contract, §7
manifest, §12 branch plan). Delete this file once the app is deployed on the
platform with sign-in and rollback working; the records in `docs/decisions/`
are the lasting source of truth.

## State: §12 work items 1–6 done

| # | Item | Commit | Record |
|---|------|--------|--------|
| — | Branch rebuilt (old WIP never pushed); CLAUDE.md, mise .NET pin, TZ test fix | `da682f7` | [0001](../decisions/0001-rebuild-platform-adopt-branch.md) |
| 1 | Transaction-local RLS user context; PgBouncer-backed test | `4466c7b` | [0002](../decisions/0002-transaction-local-user-context.md) |
| 2 | No `CREATE ROLE`; `--migrate` job as owner; grants to `DATABASE_RUNTIME_ROLE` | `d67b5d5` | [0003](../decisions/0003-migration-job-and-runtime-role.md) |
| 3 | `DATABASE_URL` + password file, `OIDC_*`, `PLATFORM_CA_FILE`, `PORT`; users keyed by `(iss, sub)`; standard logout | `50c55a1` | [0004](../decisions/0004-identify-users-by-issuer-and-subject.md), [0005](../decisions/0005-read-config-from-runtime-contract.md) |
| 4 | `platform.toml` (= §7 example + `[previews]`), `deploy/Dockerfile.static`, contract smoke script | `199b9f1` | [0006](../decisions/0006-platform-manifest.md) |
| 5 | Preview seed fixture + sanitizer (`--seed fixture\|sanitize`) | `cf2a6d0` | [0007](../decisions/0007-preview-seed-fixture-and-sanitize.md) |
| 6 | Compose stack kept for local dev only, reshaped like the platform | see `git log` | [0008](../decisions/0008-local-compose-stack.md) |

Verification on this Mac (transcripts in the PR description):
- `dotnet test server/server.Tests`: all pass (Postgres 18.6, PgBouncer 1.26.1
  in transaction mode, real JWT validation against an HTTPS stub issuer).
- `scripts/test-platform-contract.sh`: the API image as a platform pod.
- `scripts/test-docker-compose.sh`: the local stack.
- Playwright `e2e/oidc.spec.ts` + `e2e/auth-gate.spec.ts` (chromium).
- `platform.toml` accepted by a copy of the platform's `internal/manifest` parser
  (`0e71564`); rendered prod `/runtime-config.json` matches what the SPA reads.

## Requests to the platform (contract v1 gaps found here)

1. **Pocket ID access tokens have no `email`** (v2.19.1, RFC 9068 profile;
   `email` only in the ID token and `/userinfo`). §6a's "same claim set in both
   modes: sub, email, name, groups, env, app" does not hold for `oidc` mode
   bearer tokens, and §12's "IdP switch is cheap because users are keyed by
   email" was wrong (fixed here by keying on `(iss, sub)`, record 0004).
   Please correct §6a/§12.
2. **OIDC client per environment** must be: `id = workout-app-<env>`,
   `isPublic = true`, `pkceEnabled = true`,
   `callbackURLs = ["${PLATFORM_PUBLIC_URL}/"]` and
   **`logoutCallbackURLs = ["${PLATFORM_PUBLIC_URL}/"]`**. The SPA logs out
   via `end_session_endpoint` with `post_logout_redirect_uri` +
   `id_token_hint`. Pocket ID only redirects back to a registered logout URL,
   otherwise it shows its own signed-out page.
3. **Static security headers.** The nginx image set CSP / X-Frame-Options /
   etc. (`deploy/nginx-site.conf`, `deploy/configure-runtime-csp.sh` restricts
   `connect-src` to the OIDC issuer origin). The edge serving `[static]` drops
   them. Proposal: the edge sets default security headers for static sites,
   with a CSP whose `connect-src` is `'self'` + the environment's
   `OIDC_ISSUER` origin (or a `[static.headers]` table).
4. **Seed hooks.** `seed = "fixture"` needs a way to run the app's scripts;
   the parser rejects unknown keys today. Proposal for `[previews]`:
   ```toml
   fixture = "dotnet server.dll --seed fixture"    # after migrate, owner role, against <app>_seed_next
   sanitize = "dotnet server.dll --seed sanitize"  # after loading a staging dump, before freezing
   ```
   Both run like `migrate` (`/bin/sh -c` in `migrate_service`'s image, owner
   `DATABASE_URL`, one transaction each, exit 0 required).
5. **Ownership after a CoW clone.** `CREATE DATABASE <app>_pr_42 TEMPLATE
   <app>_seed OWNER <app>_pr_42` changes only the database owner; tables stay
   owned by the seed's owner role. Then the preview's `--migrate` fails
   (`must be owner`) and RLS `FORCE` applies to the wrong owner. The platform
   should `REASSIGN OWNED BY <seed owner> TO <preview owner>` in the clone (as
   superuser) before the migrate job. Grants to the preview's `_rt` role come
   from re-running `--migrate` (idempotent); stale grants to `<app>_seed_rt`
   are harmless but could be revoked.
6. **Runtime role connect rights.** Tests here use
   `REVOKE CONNECT … FROM PUBLIC; GRANT CONNECT … TO <db>_rt`. The platform
   plans `pg_hba samerole` with `GRANT <db> TO <db>_rt WITH INHERIT FALSE, SET
   FALSE` (its handoff). The migration grants assume `_rt` is **not** a
   member that inherits owner privileges. Keep `INHERIT FALSE`.
7. `DATABASE_URL` parsing accepts only `sslmode` as a query parameter. If the
   platform adds others, tell this app (it fails fast on unknown ones, so the
   failure would be visible in the migrate job).

## Left to do (not in items 1–6)

- **Platform end-to-end** (platform session): `git push` deploy to prod,
  passkey sign-in via the virtual authenticator, rollback (phase 1 exit). Then
  previews (phase 2). Nothing here has run on the platform yet.
- Retarget the Playwright suite at the platform URL and switch sign-in to the
  WebAuthn virtual authenticator (§12, §0.2). Today `e2e/` runs against
  `vite dev` with mocked OIDC.
- Local compose: swap Authentik → Pocket ID to match the platform (§12). Kept
  as-is for now (record 0008).
- Contract step for record 0004: make `users.issuer/subject` `NOT NULL` and
  drop the email bridge once no unlinked rows remain (none exist on the
  platform, which starts empty).
- CI: `publish-release-images.yml` runs `dotnet test` on ubuntu-latest. The
  tests now pull `postgres:18.6-alpine` and `edoburu/pgbouncer:v1.26.1-p0`;
  this was not run in CI here. CI still builds the nginx frontend image; for
  the §7 prebuilt-image path it would need to publish the `Dockerfile.static`
  `site` stage instead.
- `scripts/test-docker-compose.sh` needs host port 80 and ~3 minutes for
  Authentik on a fresh volume. It was broken on the base branch (worker lacked
  the bootstrap variables) and is fixed here (record 0008).
