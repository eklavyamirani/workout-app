# 0024 — Demo kit on Linux and in a cloud session: start dockerd, serve the provider keys on the bridge, build behind a proxy

- Date: 2026-11-21 · Status: agent-decided (orchestrated worker session; the owner chose that the scout's cloud session builds the prototype and sends the video there)
- Affects: `demo/kit/docker.mjs` (new), `demo/kit/serve.mjs`, `demo/README.md`
- Reversibility: easy. Kit code only; no app, runner, schema or deployment change. A Mac takes the same paths as before.

## Context
The first prototype demo recorded in a cloud session (Linux, root, an HTTPS proxy with its own CA, Docker
installed but not running) needed four workarounds by hand: starting `dockerd`, building the API image with
the proxy's CA, a userspace forwarder so the API container could reach the kit's stand-in provider
(`host.docker.internal` is the Docker bridge on Linux, and the kit listened on loopback only), and the
machine's own Playwright browsers. An `iptables` redirect was refused there, rightly: the kit must not change
the machine's network rules. The browser and the voice are the runner's (violin's) part.

## Decision
1. **Docker:** `ensureDocker()` keeps the Mac message. On Linux, as root with `dockerd` installed and no
   daemon answering, the kit starts `dockerd` (log and pidfile in `demo/.cache/`); `serve.mjs --stop` stops
   that one, never a daemon it didn't start. Otherwise it says what to run.
2. **Provider keys on the bridge:** on Linux the kit also listens on the default bridge's gateway (what
   `host-gateway` resolves to) at the kit's port, serving only the provider's discovery document and JWKS
   (GET). Token issuing stays on loopback. If that address isn't on the machine (Docker Desktop for Linux),
   the kit relies on Docker's own forwarding, as on a Mac.
3. **Behind a proxy:** with `HTTP(S)_PROXY` set on Linux, or `DEMO_CA_BUNDLE` anywhere, the kit builds the API
   image itself: `server/Dockerfile` unchanged, `--network host`, the proxy variables as build arguments, and
   the CA added to the SDK build stage through a named build context that stands in for
   `mcr.microsoft.com/dotnet/sdk:8.0`. The CA comes from `DEMO_CA_BUNDLE` or the usual CA variables.
4. **No file watching on Linux** (`server.watch = null` on the resolved Vite config; `DEMO_WATCH=1` keeps
   it): a container's inotify handles ran out in testing (EMFILE), and a recording needs no live reload.
5. **Upstream (runner, violin):** a fallback to an installed Playwright's browsers and ffmpeg, and a better
   free Linux voice, asked for through the orchestrator; the copied runner is not edited here.

## Alternatives
| Option | Pros | Cons |
|--------|------|------|
| **Chosen: kit starts dockerd as root on Linux** | One command in a cloud session | Starts a daemon; limited to root, a dockerd it can find, and no daemon already running |
| Only print how to start Docker | Never starts anything | The cloud session's run stalls on a step the kit can do |
| **Chosen: keys on the bridge gateway (GET discovery + JWKS)** | No network rule changes; public data only | A second listener on Linux; depends on the default bridge's gateway |
| Bind the whole kit on 0.0.0.0 | One listener | Exposes token issuing and the app beyond loopback |
| Userspace forwarder to loopback | Worked in the cloud session | Forwards token issuing too; another process to manage |
| iptables redirect | Transparent | Changes the machine's network rules; refused there |
| Run the API on the host network | No bridge involved | Changes the compose file for every machine; port clashes |
| **Chosen: build with a named context that adds the CA** | `server/Dockerfile` untouched; production builds unchanged | Needs BuildKit (`docker build --build-context`) |
| Add a CA step to `server/Dockerfile` | Simple | Changes the production image's build for a demo need |

## Revisit if
A cloud run shows another gap; violin's runner gains the browser fallback (re-sync the copy); the default
bridge is disabled on a machine (`docker network inspect bridge` fails).

## Review

- 2026-11-22: the upstream asks in item 5 landed in violin (#41, `4790d8f`): the runner falls back to an
  installed Playwright, `ffmpeg-static` is optional, Kokoro is the Linux voice. The copy is re-synced to
  `4790d8f`; the drift check now also covers `runner/voice/` and optional dependencies. `demo/README.md`
  answers the contract's new item 7 (can a demo be recorded in a Linux cloud session: yes, with Docker).
