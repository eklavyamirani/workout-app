# 0005 — Read configuration from runtime contract v1

- Date: 2026-10-23 · Status: agent-decided
- Decided by: Claude Code session (workout-app adoption) · Affects: `server/Program.cs`, `server/Configuration/*`, SPA `oidc.ts`, `e2e/oidc.spec.ts`, tests; platform §6a, §6b.1, §12 item 3
- Reversibility: easy — each source falls back to the previous local
  configuration keys.

## Context
§12 item 3: connection info comes from `DATABASE_URL` (+ password file), and
OIDC settings from `OIDC_*` / `/runtime-config.json`. The pod also has to
reach `https://id.plat.test`, whose certificate comes from the platform CA
(platform record 0001), and has to listen on `PORT`. The SPA already reads
`/runtime-config.json` with the keys the §7 example renders. Its logout,
though, navigated to Authentik's `/flows/-/default/invalidation/`, which
does not exist on Pocket ID.

## Decision
- **Database:** `DATABASE_URL` wins over `ConnectionStrings:Default`. It is
  parsed into an Npgsql string (Npgsql does not take URLs), percent-decoded,
  with `sslmode` supported. Other query parameters are rejected, and the
  URL is never echoed in errors. A password in the URL wins; otherwise
  `DATABASE_PASSWORD_FILE` is used. `No Reset On Close=true` is set because
  the contract URL is the transaction pooler (Npgsql's recommendation,
  [npgsql.org/doc/compatibility.html](https://www.npgsql.org/doc/compatibility.html)).
- **OIDC:** `OIDC_ISSUER` → authority + valid issuer; `OIDC_AUDIENCE`
  (then `OIDC_CLIENT_ID`) → valid audience. `Auth:*` stays as the
  local-dev fallback, `Auth:MetadataAddress` for compose only.
- **CA:** when `PLATFORM_CA_FILE` is set, the JwtBearer backchannel
  (discovery + JWKS) trusts exactly the certificates in that PEM bundle
  (`X509ChainTrustMode.CustomRootTrust`), rather than depending on how the
  base image's OpenSSL reads `SSL_CERT_FILE`.
- **PORT:** if set, Kestrel listens on `http://+:$PORT`.
- **SPA logout:** use the discovery `end_session_endpoint` with
  `client_id`, `post_logout_redirect_uri` and `id_token_hint` (OpenID
  Connect RP-Initiated Logout 1.0). Pocket ID requires the hint to redirect
  back (`end_session_service.go`). Without discovery, sign out locally.
- **Tests:** `ContractAppFactory` configures the API only through contract
  variables. It uses `DATABASE_URL` without a password plus a password
  file, through PgBouncer, and real JwtBearer validation against an HTTPS
  stub issuer signed by a throwaway CA. The issuer mints Pocket ID-shaped
  tokens (no email; `aud` = [client id, issuer]). The tests check: a valid
  token syncs; wrong audience (`workout-app-pr-42`), wrong key and wrong
  issuer are rejected; system trust cannot reach the issuer while the CA
  bundle can.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: contract vars first, old keys as fallback; explicit CA trust** | One binary for platform and local dev; CA trust is deterministic and tested | Two names per setting during the transition |
| Map contract vars to `ConnectionStrings__Default` etc. in an entrypoint script | No C# change | Shell parsing of URLs with secrets; API image has no shell tooling worth relying on |
| Rely on `SSL_CERT_FILE` only | Zero code | Behaviour depends on OpenSSL/.NET defaults in the base image; untestable on macOS dev machines |
| Keep Authentik-specific logout | No SPA change | Logout 404s on the platform IdP |

## Why
The app should run unchanged on the platform and keep working locally.
Each contract variable is exercised by an automated test, and the logout
path is the standard one both IdPs implement.

## Revisit if
The platform adds an official SDK or env-to-config convention (§6a "Platform
SDKs"), or the edge sets up CA trust for pods itself (then
`PLATFORM_CA_FILE` handling becomes redundant).

## Review
