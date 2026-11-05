# 0018 — A PostgREST layout of the sync API, for previews (`db/`)

- Date: 2026-11-04 · Status: owner-approved (the owner asked for "a preview version with PostgREST"; details by the agent)
- Decided by: Claude Code session, at the owner's request · Affects: `db/` (new), `src/storage/remote.ts`, `src/storage/runtimeConfig.ts`, `.github/workflows/platform-v2-images.yml`
- Reversibility: easy. Nothing in production changes; drop `db/` and the `syncApi` key to undo.
- Platform side: app-platform record 0042 (PostgREST as a component kind, preview variants).

## Context
The platform now offers PostgREST on an app's own database (app-platform
record 0042), so simple apps need no API server. The owner asked for a
preview of this app on it. The .NET API is small: `/api/sync/push` and
`/api/sync/pull` over `user_data` (row-level security), plus `/api/health`.

## Decision
- `db/migrations/0001-schema.sql`: the .NET schema (`server/Data/Schema.sql`),
  idempotent, runtime role from `app.runtime_role`. It applies cleanly over a
  database the .NET migrator built, so a preview of this layout starts from
  the normal preview seed (prod's migrations + fixture).
- `db/migrations/0002-sync-api.sql`: `api.sync_push(changes)` and
  `api.sync_pull(since)` with the .NET API's requests, responses, statuses and
  versioning, the user from the token's `(iss, sub)` like
  `UserResolverMiddleware`. One difference: GET requests run read-only, so a
  user row is created by the first push, not the first pull (a new user's
  first pull is empty either way).
- `db/Dockerfile` + `db/migrate.sh` (the platform's template): image
  `workout-db`, built by CI only for PRs labelled `preview:postgrest`.
- `syncApi` in `/runtime-config.json` (`dotnet` default, `postgrest`) picks
  the paths (`/sync/*` or `/rpc/sync_*`); the bodies are the same. The
  platform's variant sets it, so the same web image serves both layouts.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: same JSON as the .NET API, paths by runtime config** | The SPA's sync code is unchanged; the two APIs can be compared response by response | Two implementations of the sync rules while both exist |
| Expose `user_data` as a PostgREST table (RLS on the JWT) | Less SQL | Different request shapes; conflict/version logic moves into the SPA |
| Replace the .NET API in production now | One API | The owner asked for a preview; prod stays as it is until the comparison is in |

## Verification (component level, real software)
Postgres 18.6 with the preview's roles and a seed built by the .NET schema
+ fixture; `workout-db` migrating it (twice, as uid 10001, read-only root);
PostgREST v16.5 with the chart's settings; Traefik v3 with the chart's
route; the .NET API on its own database for reference; a test IdP signing
RS256 tokens. 13-step sync scenario: identical normalized responses from
both APIs; expired, wrong-audience, foreign-key and garbage tokens: 401 from
both. Chromium with the web image: a program created on one device appears
on a fresh one; another person sees nothing. The platform deployment E2E
(Pocket ID passkey, a labelled PR on Azure) follows when record 0042 merges.

## Revisit if
The comparison holds on a real preview: then decide whether production moves
to PostgREST (the .NET API and `server/` would go).
