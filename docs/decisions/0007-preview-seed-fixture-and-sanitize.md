# 0007 — Preview seed: SQL fixture + sanitizer, run as `--seed` jobs

- Date: 2026-10-23 · Status: agent-decided
- Decided by: Claude Code session (workout-app adoption) · Affects: `server/Data/Seed/*.sql`, `server/Data/Seeder.cs`, `server/Program.cs`, tests; platform §5.2, §7 `[previews]`, §12 item 5
- Reversibility: easy — data scripts only; the manifest says only
  `seed = "fixture"`.

## Context
§5.2 builds a frozen `<app>_seed` per app. A job "dumps staging (or a
fixture), applies a per-app sanitize script, restores into
`<app>_seed_next`". Previews are CoW clones of the seed. §12 item 5 asks
the app for both pieces. Contract v1 has no manifest key that says how to
run them, and the platform parser rejects unknown keys (record 0006).

## Decision
- `server/Data/Seed/fixture.sql` adds two synthetic users (issuer
  `urn:workout-app:fixture`, so nobody can sign in as them) with
  representative GZCLP and ballet data in the SPA's key and JSON shapes.
  It writes under each user's RLS context and is idempotent.
- `server/Data/Seed/sanitize.sql` re-keys every non-fixture user to issuer
  `urn:workout-app:sanitized`, subject `sanitized-<id>`, with no email. It
  strips user-typed free text: session `notes`/`practiceNext`/`skipReason`,
  per-activity `notes`, string `customValues`, activity `description`,
  reference `note`, and video links. Training data is kept, and the script
  fails if any real identity remains.
- Both run as `dotnet server.dll --seed fixture|sanitize`. They use the
  same image, owner connection and one-transaction rule as `--migrate`.
  Proposed manifest keys are in the handoff.
- Tests: the fixture is idempotent and consistent (every session points at
  a listed program and its activities). Sanitize removes identity and every
  "private" string, keeps sets, reps, weights and durations, and leaves
  fixture users untouched; the original identity sees an empty account. It
  is idempotent, and the `--seed` command works as a process (unknown
  script → non-zero exit).

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: SQL scripts run by the app binary** | Same mechanism as `migrate`; no psql in the platform; runs through the pooler; tested | Platform needs a hook to invoke them |
| Plain `.sql` paths for the platform to run with psql | No app code | psql through a transaction pooler needs care; RLS context per user still needed; the platform would need a psql image |
| `pg_dump` of a hand-made DB as the fixture | Exact restore | Binary/opaque, drifts from migrations, has role names baked in |
| Sanitize by deleting all real users | Simplest, safest | Seed from staging becomes the fixture; loses representative volume |

## Why
Re-keying identities matters most. The IdP is shared across environments
(§6a), so without it a staging user would sign straight into their copied
data in every preview. Keeping training data keeps the seed useful.

## Revisit if
New free-text fields are added to the SPA types (`src/types/index.ts`): the
sanitizer must learn them. Program and activity names are user-typed but
kept; drop or replace them if they turn out to hold personal data. The
platform defines its own seed hook: adapt the invocation, not the scripts.

## Review
