# 0006 — `platform.toml` = the §7 workout-app example plus `[previews]`

- Date: 2026-10-23 · Status: agent-decided
- Decided by: Claude Code session (workout-app adoption) · Affects: `platform.toml`, `deploy/Dockerfile.static`, `.dockerignore`, `server/.dockerignore`, `scripts/test-platform-contract.sh`; platform §7, §12 item 4
- Reversibility: easy — manifest and build files only.

## Context
§12 item 4 asks for a manifest with a static frontend build,
`services.api` (port 5000, `/api/health`), `[database] runtime_role = true`,
`[auth] mode = "oidc"` and `[previews] seed = "fixture"`. Platform record
0002 / §7 gives the exact multi-component example for this app. The
platform's parser (`app-platform` `internal/manifest/manifest.go`,
commit `0e71564`) rejects unknown keys.

## Decision
- `platform.toml` is the §7 example key for key, plus
  `[previews] enabled = true, seed = "fixture"`, which item 4 requires and
  the parser accepts. A copy of the platform parser accepts it (transcript
  in the PR). The rendered prod `/runtime-config.json` has exactly the keys
  `src/storage/runtimeConfig.ts` reads; `apiBaseUrl` is left out, so the
  SPA uses same-origin `/api`.
- `deploy/Dockerfile.static` builds the SPA, then a `FROM scratch AS site`
  stage holds only `dist/`. It removes the local-dev
  `runtime-config.json`, so the edge's rendered file is the only one.
  `deploy/Dockerfile` (nginx) stays for the compose stack.
- `.dockerignore` files keep host `node_modules` (macOS binaries) and
  `bin/obj` out of Linux build contexts. Without them `COPY . .` would copy
  them in.
- Seed and sanitize commands are **not** manifest keys yet: the parser
  would reject them. They are proposed in `docs/handoff/platform-adopt.md`
  (record 0007).
- `scripts/test-platform-contract.sh` runs the API image as a platform
  pod would. It provisions roles, PgBouncer in transaction mode, the
  migrate job through `/bin/sh -c`, then the runtime-role pod with a
  read-only root fs, uid 10001 and no capabilities. It checks health, a
  401 without a token, and runtime-role DDL denial. This is a stand-in
  until the platform's real deploy.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: §7 example + `[previews]`** | Exactly what the platform session tests against (`TestWorkoutApp`); parser-validated | Seed hooks not expressible yet |
| Add `fixture`/`sanitize` keys now | Self-describing | `Parse` fails on unknown keys → deploy breaks |
| Serve the SPA from the nginx image as a service | Keeps CSP/security headers from `nginx-site.conf` | §6.1 says static = no pod; costs a gVisor sandbox per env (platform record 0002 rejected it) |

## Why
Matching the example removes guesswork for the platform session's first
`git push` deploy. Everything beyond it is either accepted by the parser
or written up as a contract request.

## Revisit if
The platform adds manifest keys for seeds or static response headers. One
regression to track: with the edge serving static files, the CSP and
security headers from `deploy/nginx-site.conf` no longer apply in deployed
environments. This is requested from the platform in the handoff.

## Review
