# 0021 — Demo kit: the whole app in the session, the preview fixture, a stand-in sign-in, violin's runner copied

- Date: 2026-11-19 · Status: agent-decided (orchestrated worker session, eklavyamirani/app-platform#77; the owner decided that demos are recorded on the development machine against the app running in the session)
- Affects: `demo/` (new), `vite.config.ts` (Vitest exclude), `README.md`
- Reversibility: easy. `demo/` stands alone; deleting it and the one Vitest line undoes everything. No app code, schema, fixture or deployment changes.

## Context
Product Scout turns an approved idea into a prototype and a narrated 60-second
demo video in a fixed template (5 s problem, 40 s walkthrough, 10 s evidence,
5 s reason not to build). Violin, a static local-first app, has the runner and
the kit contract (`demo/` in eklavyamirani/violin-practice-system). Workout is
the second app and the first with a server: a React SPA, a .NET API and
Postgres, sign-in by OIDC, a preview fixture in `server/Data/Seed/fixture.sql`,
and `deploy/docker-compose.yml` (Traefik on port 80, Authentik) for local
development. A demo must start with the fixture loaded and with no sign-in to
the platform, and leave nothing running.

## Decision
1. **The whole app.** `node demo/kit/serve.mjs` (and the kit's `start()`) runs
   the front end in-process (Vite through the repository's `vite.config.ts`, as
   `npm run dev`) and Postgres, the migration job, the fixture seed job and the
   API in Docker as a compose project of its own (`demo/kit/compose.yml`,
   `workout-demo-<port>`, tmpfs data, loopback ports, throwaway passwords).
   `close()` and `serve.mjs --stop` take everything down.
2. **The preview fixture as demo data**, loaded by the same
   `dotnet server.dll --seed fixture` previews use; the browser gets it by
   signing in and syncing.
3. **A stand-in identity provider in the kit** (`demo/kit/idp.mjs`): issuer
   `urn:workout-app:fixture` (the fixture users' own issuer), tokens only for
   the fixture subjects, an RSA key generated per run and kept in memory,
   served on the kit's loopback origin. Only the session's API trusts it
   (`Auth__Issuer`, `Auth__MetadataAddress` in the demo compose file). It
   supports the app's real authorization-code + PKCE flow and a kit-only grant
   for the load page.
4. **The runner is violin's, copied byte for byte** with `CONTRACT.md` and two
   checks, pinned in `demo/runner/UPSTREAM.json` (commit `da7db07`), with
   `demo/test/runner-drift.mjs` reporting each file as same / changed
   upstream / changed here. The workout kit needed no runner change.
5. **The API image is tagged with the git tree hash of `server/`**, built on
   the first start and reused until `server/` changes; uncommitted `server/`
   changes rebuild every start.
6. **`vite.config.ts` excludes `demo/**` from Vitest**, whose default pattern
   picked up the runner's plain-Node `template.test.mjs`.
7. Two template-check proposals on features already on `main`:
   `adhoc-workout-check` (New workout, prefill, log, skip, Finish, read back
   from the API) and `preview-next-workout-check` (read-only).

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: whole app, compose for Postgres/API, Vite in-process** | Real API, database, RLS, sync and seed path; a feature that touches the server can be demoed; ready in ~10 s after the first build | Needs Docker; first start builds the API image (~12 min here) |
| SPA only, anonymous mode, fixture written to localStorage (violin's pattern) | No Docker; seconds to start; fits violin's contract as written | Not the whole app: no API, sync or server data; the fixture would be re-expressed in a second format |
| `deploy/docker-compose.yml` as it is | Already exists | Traefik needs port 80 (taken here by the shared local cluster); Authentik needs a setup script and a person or a scripted login at its UI; shares the developer's volumes |
| **Chosen: stand-in provider for fixture identities only** | No app change; the API still validates every token; nothing real to leak; the app's own sign-in flow works | A small OIDC provider to keep in step with what the app reads (discovery, JWKS, code + PKCE) |
| Auth bypass flag in the API for demos | Simplest | Weakens the API's security in shipped code; a stop-list item |
| Authentik with a scripted login | The existing local IdP | Slow to start (~2 min plus setup), a password-based login to automate, a user that is not the fixture's |
| **Chosen: preview fixture** | One fixture for previews and demos; covered by the server tests | Fixed October 2026 dates: "Past workouts" (30 days) is empty from 19 November on |
| A demo-only fixture with dates relative to today | Current-looking history | A second fixture to keep in step with the schema and the SPA's shapes |
| **Chosen: copy violin's runner, with a drift check** | Works now; no new repository, package or credential; drift is visible and one command to check | Two copies until there is a shared home; a change must be made in violin and copied |
| Shared runner now (a package or repository) | One copy | A new repository or registry is outside this repository's scope and the owner's call; see the recommendation below |
| Git submodule or subtree of violin | Tracks upstream | Pulls in the whole violin app, or needs submodule handling in every clone and CI |

## Why
The brief asks for the whole app with the fixture and no platform sign-in.
Running the real API against the real seed is what makes a full-stack demo
honest, and the stand-in provider gets there without touching the app's auth.
Copying the runner gets a working demo today; the drift check keeps the copy
honest until a shared home is decided.

## Recommendation (not built)
Lift `demo/runner/`, `demo/CONTRACT.md` and the template checks into one
public repository (for example `eklavyamirani/demo-runner`) that each app's
`demo/package.json` installs as a git dependency pinned to a commit. No
registry or token is needed, and an app updates by changing one pin. It needs a
new repository, so it is the orchestrator's and the owner's decision. The
contract changes a full-stack app needs are listed in `demo/README.md`.

## Revisit if
The runner changes in violin (copy it back, or decide the shared home); a third
app needs the runner; previews or demos need recent history (make the fixture's
dates relative); demos must run on Linux with native Docker (the API reaches
the kit through `host.docker.internal`, which a loopback-bound kit doesn't
answer there).

## Review
- 2026-11-20: shared runner home decided by the orchestrator: keep the copies with the drift check (option
  a); move to a small public runner repository pinned by commit when a third app needs the runner or the
  runner next changes in a way both apps need. Copy re-synced to violin `e0949e8` (violin's contract now
  covers server-backed apps; `publish.mjs` uploads to Downloads when given a token), adding
  `test/publish.test.mjs`; `runner-drift.mjs` now also flags new upstream runner tests. `demo/README.md`
  keeps only the two kit details the contract leaves to the kit.
