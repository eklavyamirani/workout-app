# Workout demo kit (Product Scout)

Records a proposal as a narrated demo video of exactly 60 seconds, against the whole workout app running in
the development session (never the deployed app): 5 s problem, 40 s walkthrough, 10 s evidence, 5 s strongest
reason not to build. Part of eklavyamirani/app-platform#77. Decision record: `docs/decisions/0021-demo-kit.md`.

The runner (`demo/runner/`), the kit contract (`demo/CONTRACT.md`) and the template checks are violin's,
copied unchanged (see [The runner is a copy](#the-runner-is-a-copy)). This file covers the workout kit and
the details the contract leaves to it.

## What the machine needs

- **Docker**, for Postgres and the API. On macOS: `colima start` (colima and docker-cli come from `mise`), or
  Docker Desktop. On Linux: Docker Engine with the compose plugin; as root, the kit starts `dockerd` itself
  when it is installed but not running (see [Linux and cloud sessions](#linux-and-cloud-sessions)). Nothing
  listens beyond `127.0.0.1`, except the provider's public keys on the Docker bridge on Linux.
- **Node 20+**, the repository's `npm ci` (the kit uses the repository's own Vite) and `npm --prefix demo ci`
  (Playwright 1.64.1, static ffmpeg/ffprobe). The browser: `npx --prefix demo playwright install chromium` if
  it isn't cached, or none at all where the machine already has a Playwright with its browsers (a cloud
  session): the runner then uses that one (`demo/runner/browser.mjs`).
- **Text to speech**: macOS `say` (voice Samantha), built in. On Linux, Kokoro: run
  `demo/runner/voice/setup-kokoro.sh` once (Python venv and model files in `demo/.cache/voice/kokoro`); without
  it the runner falls back to espeak-ng and says so. Details: violin's `demo/README.md`, "Text to speech".
- No account, token, sign-in or network service other than the Docker image registries on the first start.
  Uploading the finished video to Downloads needs an upload token from the owner; without one the runner
  records and doesn't upload.

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

After recording, the runner uploads the video to the platform's Downloads app and prints the owner's link,
if there is an upload token in `DEMO_UPLOAD_TOKEN` or in a file named by `DEMO_UPLOAD_TOKEN_FILE` (never
printed or logged). Without a token, or with `--no-upload`, it makes no request and says it did not upload;
the video is still there. Details: `demo/runner/publish.mjs`.

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
node demo/test/publish.test.mjs         # upload step against a local stand-in server (curl, no network)
node demo/test/browser.test.mjs         # which Playwright the runner picks, and that node exits after its video check (launches Chromium, no network)
node demo/test/same-structure.mjs demo/out/*/*.demo.json demo/out/*/*/*.demo.json   # after two or more demos
node demo/test/runner-drift.mjs         # is the runner copy still violin's? (network, no token)
```

## The runner is a copy

`demo/runner/` (with `runner/voice/`), `demo/CONTRACT.md` and the runner checks (`demo/test/template.test.mjs`,
`demo/test/same-structure.mjs`, `demo/test/publish.test.mjs`, `demo/test/browser.test.mjs`) are violin's (eklavyamirani/violin-practice-system,
`demo/`), copied byte for byte at the commit in `demo/runner/UPSTREAM.json`, with the same pinned
dependencies. Don't edit them here: change them in violin, copy them back, update the commit, and run
`node demo/test/runner-drift.mjs` (it reports each file as same, changed upstream, or changed here, and any
runner file or runner test violin has that this copy lacks). The workout kit needed no runner change. Why a
copy and not a shared package yet: `docs/decisions/0021-demo-kit.md`.

## Kit details the contract leaves to the kit

`demo/CONTRACT.md` now covers server-backed apps (the points this kit first raised in
eklavyamirani/workout-app#46: starting a database and API, the server's seed, a stand-in sign-in, the printed
load URL, fixed-date fixtures, machine needs and start times). Two details stay specific to this kit:

1. **The fixture's dates are fixed** (October 2026, the preview fixture). The walkthroughs don't depend on
   recent dates, but "Past workouts" (30 days) is empty from 19 November 2026 on. Making the fixture
   date-relative is a fixture change that would help previews too.
2. **Containers reaching the kit.** The API fetches the stand-in provider's keys from the kit process through
   `host.docker.internal`. On colima and Docker Desktop, Docker forwards that to the machine's loopback; on
   Linux the kit also serves the keys on the Docker bridge (below).

## Linux and cloud sessions

**Can a demo be recorded in a Linux cloud session?** (`demo/CONTRACT.md` item 7.) Yes, with Docker: beyond
the runner's own steps (violin's `demo/README.md`, "Recording in a cloud session": `npm --prefix demo ci`,
`demo/runner/voice/setup-kokoro.sh`, then `node demo/runner/demo.mjs demo/proposals/<id>.json --no-upload`),
the workout kit needs:

- the repository's `npm ci` (the kit runs the repository's Vite);
- Docker Engine: a running daemon, or root with `dockerd` installed (the kit starts it), which in a container
  means a privileged one;
- network for the first start: Docker Hub (`registry-1.docker.io`, `auth.docker.io`) for Postgres,
  `mcr.microsoft.com` and its data hosts for the .NET images, and `api.nuget.org` for the API build (about
  12 minutes on a Mac; later starts reuse the image);
- a proxy with its own CA is handled (table below); if it isn't found on its own, `DEMO_CA_BUNDLE=<ca.pem>`.

Verified so far: the kit, in a privileged Linux container with and without a proxy (2026-11-21, decision
0024). A whole recording on Linux (2026-11-23: `node:24-bookworm` beside a `docker:29-dind` daemon,
Playwright 1.57.0 installed, Kokoro) wrote the complete 60-second video; the runner then never exited,
because its video check left Playwright 1.57's encoder waiting. violin fixed that in `a85b3de`, copied here;
the fixed runner hasn't been through a whole Linux recording yet. The first cloud recording (2026-11-21)
predates the kit and runner changes and needed hand workarounds.

A cloud session's container (Linux, root, a proxy with its own CA, no Docker daemon running) needs these, and
the kit does them itself; a Mac is unchanged.

| What | The kit does | Override |
|---|---|---|
| No Docker daemon | As root with `dockerd` installed, starts it (log `demo/.cache/dockerd.log`); `npm --prefix demo run stop` stops that one again. Otherwise says what to run. | Start Docker yourself first |
| API container → stand-in provider | Also listens on the Docker bridge's gateway (what `host.docker.internal` is in containers on Linux), on the kit's port, for the provider's discovery document and public keys only (GET; nothing there issues tokens). No firewall or iptables change. | — |
| Proxy with its own CA | When `HTTPS_PROXY`/`HTTP_PROXY` is set (or `DEMO_CA_BUNDLE`), builds the API image itself: `server/Dockerfile` unchanged, on the host network (so a proxy on 127.0.0.1 works), with the proxy variables as build arguments and the CA added to the .NET SDK build stage (a named build context replaces `mcr.microsoft.com/dotnet/sdk:8.0` with the SDK plus the CA). The CA comes from `DEMO_CA_BUNDLE`, else `SSL_CERT_FILE`, `NODE_EXTRA_CA_CERTS`, `REQUESTS_CA_BUNDLE` or `CURL_CA_BUNDLE`. A `dockerd` the kit starts inherits the proxy variables for its image pulls. | `DEMO_CA_BUNDLE=/path/ca.pem` |
| Few inotify handles | Doesn't watch files (no live reload; a demo doesn't need it). | `DEMO_WATCH=1` |

What the repository can't fix, and stays with the machine or the runner:

- **Docker itself**: installing Docker Engine, and `dockerd` needing root or a privileged container.
- **The browser and the voice** are the runner's (violin's): it falls back to the machine's installed
  Playwright, and uses Kokoro once `setup-kokoro.sh` has run, else espeak-ng.
- **Uploading**: no upload token in a cloud session, by design; the video is sent in the session.

