# 0004 — Identify users by `(iss, sub)`, not email

- Date: 2026-10-23 · Status: agent-decided
- Decided by: Claude Code session (workout-app adoption) · Affects: `server/Data/Schema.sql` (`users`), `UserResolverMiddleware`, `UserInfo`, SPA `auth.ts`; platform §6a, §12
- Reversibility: moderate — the columns are additive; going back to email
  keys means re-adding the unique constraint once duplicates are resolved.

## Context
The API found users by the access token's `email` claim. §12 calls that
"cheap" for the IdP switch but notes the risk, and suggests `(issuer, sub)`
with email as a one-time bridge. Checking Pocket ID v2.19.1 (the platform
IdP, tag `v2.19.1`, commit `23c7f07`) showed this is not optional. Access
tokens are RFC 9068 JWTs (`backend/internal/oidc/provider.go`:
`fositeoauth2.RFC9068JWTStrategy`; `session.go` `GetJWTClaims` adds no extra
claims). They carry `iss`, `sub`, `aud`, `client_id`, `scope`, `exp`, `iat`
and `jti`. `email` appears only in ID tokens and `/userinfo`
(`claims_service.go` `applyIDTokenClaims` / `GetUserClaims`). So every API
request on the platform would have been rejected with 401.

## Decision
- `users` gains `issuer` and `subject` with a unique index. `email` becomes
  nullable and non-unique, and is informational only. The middleware keys
  on the token's `iss` + `sub`. JwtBearer runs with `MapInboundClaims =
  false` so claim names stay as issued.
- Bridge: a pre-existing row with no subject is claimed by the first
  identity that presents its email. The `UPDATE` re-checks
  `subject IS NULL`, so a concurrent second claimant loses.
- The SPA keeps the ID token and reads the displayed email from it. The
  access token is the fallback.
- Expand only: the issuer/subject columns stay nullable while legacy rows
  may exist. Making them `NOT NULL` is a later contract step.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: `(iss, sub)` + one-time email bridge** | Works with Pocket ID; immutable, IdP-scoped key; recommended by §12 | Schema change; email bridge trusts the IdP's email once |
| Call `/userinfo` per request for email | Keeps email keying | Extra round trip per request; email still mutable/unverified; IdP outage breaks the API |
| Ask the platform to configure Pocket ID custom claims into access tokens | No app change | No such hook for access tokens in v2.19.1 (custom claims feed ID token/userinfo); couples the platform to one app |
| Key by `sub` alone | Simpler | Two IdPs (local Authentik, platform Pocket ID) could issue the same `sub` |

## Why
`sub` is the only stable user identifier the platform IdP puts in the
bearer token. Pairing it with `iss` follows OIDC Core §2 ("sub … locally
unique and never reassigned within the Issuer"). There is no prod data
(§0 stop-list, `prod_has_real_data: false`), so the bridge only matters for
local dev databases.

## Revisit if
The platform's `edge` mode (§6a) forwards an identity JWT with a different
issuer: the app would see `iss` = platform, and needs the same bridge per
mode switch. Or once no unlinked rows remain: contract step, `NOT NULL` +
drop the bridge.

## Review
