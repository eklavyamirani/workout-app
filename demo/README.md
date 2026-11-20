# Workout demo kit (Product Scout)

Records a proposal as a narrated demo video of exactly 60 seconds, against the whole workout app running in
the development session (never the deployed app): 5 s problem, 40 s walkthrough, 10 s evidence, 5 s strongest
reason not to build. Part of eklavyamirani/app-platform#77. Decision record: `docs/decisions/0021-demo-kit.md`.

The runner (`demo/runner/`), the kit contract (`demo/CONTRACT.md`) and the template checks are violin's,
copied unchanged (see [The runner is a copy](#the-runner-is-a-copy)). This file covers the workout kit and
where it differs from that contract.

## What the machine needs

- **Docker**, for Postgres and the API. On macOS: `colima start` (colima and docker-cli come from `mise`), or
  Docker Desktop. Nothing listens beyond `127.0.0.1`.
- **Node 20+**, the repository's `npm ci` (the kit uses the repository's own Vite) and `npm --prefix demo ci`
  (Playwright 1.64.1 and its Chromium, static ffmpeg/ffprobe; `npx --prefix demo playwright install chromium`
  if the browser isn't cached).
- **Text to speech**: macOS `say` (voice Samantha), built in. On Linux see violin's notes in its
  `demo/README.md`; not tried here.
- No account, token, sign-in or network service other than the Docker image registries on the first start.

The first start builds the API image from `server/` (about 12 minutes on this machine, most of it pulling the
.NET SDK); it is tagged with the git tree hash of `server/`, so later starts reuse it and are ready in about
10 seconds. A changed `server/` is rebuilt once; uncommitted changes in `server/` are rebuilt on every start.

## Commands

```bash
npm ci && npm --prefix demo ci          # once
node demo/runner/demo.mjs demo/proposals/adhoc-workout-check.json
```

The video lands in `demo/out/<proposal-id>/<proposal-id>.mp4`, with `<proposal-id>.demo.json` next to it
(measured section timings, the narration each section used, the recording log). `--out <dir>` puts it
elsewhere, `--walkthrough <name>` picks another script, `--headed` shows the browser. The runner starts the
app, records, and stops the app again; nothing is left running, even when a walkthrough fails. A run takes
about two minutes.

To use the lived-in app by hand:

```bash
npm --prefix demo run serve             # or: node demo/kit/serve.mjs [--port 8791] [--user ballet-dancer]
```

It prints `http://localhost:8791/__demo/load`. Opening that signs the browser in as the fixture lifter and
opens the app with the fixture's GZCLP program, sessions and exercise notes, served by the real API from
Postgres. Ctrl+C stops it. From anywhere, this stops every demo stack on the machine (hand-started kits and
any containers a killed run left behind) and checks that nothing is left:

```bash
npm --prefix demo run stop              # or: node demo/kit/serve.mjs --stop
```

## What runs

```
Browser (Playwright, or yours)
   │  http://localhost:<port>        one origin, served by the kit's Node process
   ▼
Kit process (demo/kit/serve.mjs)
   ├── Vite dev server: the app, through vite.config.ts (as `npm run dev`)
   ├── /runtime-config.json   points the app's OIDC at the kit (src/storage/runtimeConfig.ts)
   ├── /__demo/oidc/*         stand-in OpenID provider for the fixture users (idp.mjs)
   ├── /__demo/load           signs the browser in, then opens the app
   └── /api/*                 forwarded to the API container
                                       │
Docker, compose project workout-demo-<port> (demo/kit/compose.yml)
   ├── db       Postgres 18.6, runtime role from deploy/initdb, data in tmpfs
   ├── migrate  API image, --migrate as the owner
   ├── seed     API image, --seed fixture (server/Data/Seed/fixture.sql, the preview fixture)
   └── api      API image as the NOBYPASSRLS runtime role, on 127.0.0.1:<random>;
                fetches the provider's keys from the kit via host.docker.internal
```

- **Demo data** is `server/Data/Seed/fixture.sql`, the same fixture preview deployments start from, loaded by
  the same `--seed fixture` command. The browser gets it the way a user does: the app signs in and its first
  sync pulls it from the API.
- **Sign-in.** The fixture's users have the issuer `urn:workout-app:fixture`, which no real identity provider
  issues. The kit's stand-in provider issues tokens for exactly those users, signed with a key generated per
  run and kept in memory; the session's API is the only one configured to trust it (`Auth__Issuer`,
  `Auth__MetadataAddress`). The load page uses a kit-only grant to start signed in; the app's own Sign in
  button also works (authorization code with PKCE, no login page). The API still validates every token
  (missing or forged tokens get 401).
- **Isolation.** Each start is its own compose project on its own ports, with throwaway database passwords in
  `demo/.cache/` (deleted on stop) and no volumes, so it never touches `deploy/`'s stack, its data, or the
  progress a developer keeps in their own browser.
- **No app changes.** The kit configures the app through what it already reads: `/runtime-config.json`,
  the API's `Auth__*` settings, and the localStorage keys its sign-in writes. The only change outside `demo/`
  is `vite.config.ts` excluding `demo/**` from Vitest (the runner's checks are plain Node scripts).

## Walkthroughs and proposals

| Proposal | Walkthrough | Shows |
|---|---|---|
| `demo/proposals/adhoc-workout-check.json` | `kit/walkthroughs/adhoc-workout-check.mjs` | New workout on an unplanned day; squat prefilled from its last set (155 × 6); log a set, skip two, Finish; reads the session back from the API and fails if it isn't there |
| `demo/test/proposals/preview-next-workout-check.json` | `kit/walkthroughs/preview-next-workout-check.mjs` | Read-only: preview the next planned day, the Programs tab, back |

Both are template checks on features already on `main`, not ideas. Narration numbers and names are read from
the page.

## Checks

```bash
node demo/test/template.test.mjs        # template timings, proposal schema, narration fallbacks (no browser)
node demo/test/same-structure.mjs demo/out/*/*.demo.json demo/out/*/*/*.demo.json   # after two or more demos
node demo/test/runner-drift.mjs         # is the runner copy still violin's? (network, no token)
```

## The runner is a copy

`demo/runner/`, `demo/CONTRACT.md`, `demo/test/template.test.mjs` and `demo/test/same-structure.mjs` are
violin's (eklavyamirani/violin-practice-system, `demo/`), copied byte for byte at the commit in
`demo/runner/UPSTREAM.json`, with the same pinned dependencies. Don't edit them here: change them in violin,
copy them back, update the commit, and run `node demo/test/runner-drift.mjs` (it reports each file as same,
changed upstream, or changed here). The workout kit needed no runner change. Why a copy and not a shared
package yet: `docs/decisions/0021-demo-kit.md`.

## Where violin's contract does not fit a full-stack app

`demo/CONTRACT.md` is violin's, unchanged. Each point below is where this kit departs from it, and what the
contract could say instead.

1. **"Start in-process … no container."** A server-backed app needs its database and API. *Instead:* start
   what the app needs with its own local-development tooling (here compose and Vite), isolated per session
   (own project name, ports, no shared volumes), bound to loopback; `close()` must leave nothing running, and
   the kit also provides a stop command for what a killed run left behind.
2. **"Load demo data through the app's own storage, from a page the kit serves."** Workout's data lives in
   Postgres and reaches the browser through sign-in and sync. *Instead:* load it through the app's own data
   path: client storage for a local-first app, the server's seed for a server-backed one, preferably the
   fixture previews already use.
3. **No sign-in, unstated mechanism.** The contract assumes the app works without identity. *Instead:* a
   server-backed app may run a stand-in identity provider inside the kit, trusted only by the session's API,
   issuing tokens only for fixture identities, with a per-run key; never a real account or credential, and no
   auth bypass in the app.
4. **"A person opening the kit's bare origin gets the same thing."** Workout's `/` is the app itself and its
   sign-in redirect URI, so it can't also be the loader. *Instead:* the URL the kit prints loads the demo data;
   the bare origin may be the app.
5. **"Dates are relative to today."** Workout reuses the preview fixture, whose dates are fixed (October 2026).
   It still demos well (upcoming days come from the schedule, prefill comes from the last session at any
   age), but "Past workouts" (30 days) is empty from 19 November 2026 on. *Instead:* reusing the preview
   fixture is preferred; say that a fixed-date fixture ages, and that making it date-relative is a fixture
   change that helps previews too.
6. **"Make it with the app's own code."** `fixture.sql` is hand-written SQL in the app's data shapes, covered
   by the server tests. *Instead:* accept a seed the app's tests already cover.
7. **`start` time and machine needs.** The contract doesn't say what a kit may need or how long `start` may
   take. *Instead:* the checklist asks each kit to list its machine needs (here Docker) and its first and
   later start times (here about 12 minutes, then about 10 s).
8. **Containers reaching the kit.** Not in the contract; a kit detail: the API fetches the provider's keys
   from the kit process through `host.docker.internal`. That works on colima (tried) and Docker Desktop; on
   Linux with native Docker a kit bound to 127.0.0.1 is not reachable that way (not tried).
