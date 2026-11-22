// Workout demo kit: start the whole app in this session with the synthetic fixture, signed in as a
// fixture user, with no sign-in to the platform. Stop it again, leaving nothing running.
//
//   node demo/kit/serve.mjs [--port 8791] [--user gzclp-lifter|ballet-dancer]   start; Ctrl+C stops
//   node demo/kit/serve.mjs --stop                                               stop every demo stack
//
// (npm --prefix demo run serve / npm --prefix demo run stop do the same.)
//
// What runs:
//   - in this Node process: the front end (Vite, the repository's `npm run dev` server, through its
//     JS API and the repository's vite.config.ts), plus three kit routes on the same origin:
//     /runtime-config.json (points the app at the kit), /__demo/oidc (a stand-in OpenID provider for
//     the fixture users, idp.mjs) and /__demo/load (starts the browser signed in, then opens the app);
//     /api is forwarded to the API container.
//   - in Docker, as compose project workout-demo-<port> (compose.yml): Postgres 18.6, the migration
//     job, the fixture seed job (server/Data/Seed/fixture.sql, the same fixture previews start from)
//     and the API. Database data lives in tmpfs and goes with the containers.
//
// Needs: Docker (on macOS `colima start`; colima and docker-cli come from mise; on Linux as root the kit
// starts dockerd itself if it is installed), the repository's `npm ci` (for Vite) and Node 20+. The first
// start builds the API image (a few minutes; behind a proxy see docker.mjs); later starts take about 15 to
// 30 seconds.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createIdp, CLIENT_ID, BASE_PATH, DEMO_GRANT } from "./idp.mjs";
import { ensureDocker, stopKitDockerd, bridgeGateway, proxyBuild, buildApiImage } from "./docker.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(HERE, "../..");
const COMPOSE_FILE = path.join(HERE, "compose.yml");
const CACHE = path.resolve(HERE, "../.cache");
const PROJECT_PREFIX = "workout-demo-";
export const LOAD_PATH = "/__demo/load";
const log = (...a) => console.error("[kit]", ...a);

function sh(cmd, args, { env, quiet = false, allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 32 << 20 });
  if (r.error) throw new Error(`${cmd}: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) {
    throw new Error(`${cmd} ${args.join(" ")} failed (${r.status}):\n${(r.stderr || r.stdout || "").trim().split("\n").slice(-80).join("\n")}`);
  }
  if (!quiet && r.stderr && r.status !== 0) log(r.stderr.trim());
  return r;
}

// Forward /api to the API container, keeping method, headers and body
function forward(target, req, res) {
  const up = http.request({ host: "127.0.0.1", port: target.port, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${target.port}` } }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  up.on("error", (e) => { res.writeHead(502, { "content-type": "text/plain" }); res.end(`demo kit: API not reachable (${e.message})`); });
  req.pipe(up);
}

// The page that starts a browser signed in as the fixture user, then opens the app (+ query).
// It writes the same localStorage keys the app's own sign-in writes (src/storage/auth.ts).
const loadPage = (query) => `<!doctype html><meta charset="utf-8"><title>Loading the demo</title>
<script>
(async () => {
  localStorage.clear();
  sessionStorage.clear();
  const r = await fetch(${JSON.stringify(BASE_PATH + "/token")}, { method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: ${JSON.stringify(DEMO_GRANT)}, client_id: ${JSON.stringify(CLIENT_ID)} }) });
  const t = await r.json();
  localStorage.setItem("__auth_token", t.access_token);
  localStorage.setItem("__auth_id_token", t.id_token);
  localStorage.setItem("__auth_mode", "authenticated");
  location.replace("/" + ${JSON.stringify(query).replace(/</g, "\\u003c")});
})();
</script>`;

// On Linux the kit doesn't watch files: containers (a cloud session's included) often run out of inotify
// handles, and a demo doesn't need live reload. DEMO_WATCH=1 keeps watching. A Mac is unchanged.
const NO_WATCH = process.platform === "linux" && process.env.DEMO_WATCH !== "1";

function kitPlugin({ idp, api }) {
  return {
    name: "workout-demo-kit",
    // Set on the resolved config: Vite's config merge drops a null `server.watch` given to createServer
    configResolved(config) { if (NO_WATCH) config.server.watch = null; },
    configureServer(server) {
      // Added before Vite's own middlewares, so these win over vite.config.ts's /api proxy and over
      // public/runtime-config.json
      server.middlewares.use(async (req, res, next) => {
        try {
          const u = new URL(req.url, "http://x");
          const origin = `http://${req.headers.host}`;
          if (u.pathname === "/runtime-config.json") {
            res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
            return res.end(JSON.stringify({ oidcAuthority: origin + BASE_PATH, oidcClientId: CLIENT_ID, oidcRedirectUri: origin + "/", deploymentMode: "demo" }));
          }
          if (u.pathname.startsWith(BASE_PATH)) return void (await idp.handle(req, res));
          if (u.pathname === LOAD_PATH) {
            const q = u.searchParams.get("q") || "";
            res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
            return res.end(loadPage(q && !q.startsWith("?") ? "?" + q : q));
          }
          if (u.pathname === "/api" || u.pathname.startsWith("/api/")) {
            if (!api.port) { res.writeHead(503); return res.end("demo kit: API still starting"); }
            return forward(api, req, res);
          }
        } catch (e) {
          return next(e);
        }
        next();
      });
    },
  };
}

async function waitForHealth(port, seconds = 120) {
  const end = Date.now() + seconds * 1000;
  let last = "";
  while (Date.now() < end) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      const b = await r.text();
      if (r.ok && b.includes("healthy")) return;
      last = `${r.status} ${b}`;
    } catch (e) { last = e.message; }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`API did not become healthy in ${seconds} s (last: ${last}).`);
}

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once("error", reject);
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
});

const composeArgs = (project) => ["compose", "-f", COMPOSE_FILE, "-p", project];

// The API image's tag: the git tree hash of server/ when it is committed and clean (built once per
// version of the API), else "worktree" (rebuilt on every start, so local edits are always in it).
function apiImage() {
  const tree = spawnSync("git", ["-C", APP_ROOT, "rev-parse", "HEAD:server"], { encoding: "utf8" });
  const dirty = spawnSync("git", ["-C", APP_ROOT, "status", "--porcelain", "--", "server"], { encoding: "utf8" });
  if (tree.status !== 0 || dirty.status !== 0 || dirty.stdout.trim()) return { tag: "worktree", build: true };
  const tag = tree.stdout.trim().slice(0, 12);
  const have = spawnSync("docker", ["image", "inspect", `workout-demo-api:${tag}`], { stdio: "ignore" }).status === 0;
  return { tag, build: !have };
}

/**
 * Start the whole app with the fixture. Resolves to { url, loadUrl(query), close, project, apiPort }.
 * port 0 = any free port (the runner); a person gets 8791 so the URL stays the same.
 */
export async function start({ port = 0, user } = {}) {
  await ensureDocker();
  const image = apiImage();
  // Behind a proxy (a cloud session), build the image here with the proxy and its CA, then compose uses it
  const pb = image.build ? proxyBuild() : null;
  if (pb) { buildApiImage(image.tag, pb); image.build = false; }
  // vite.config.ts (loadEnv) and Tailwind (content globs) resolve paths from the working directory,
  // as under `npm run dev`; `npm --prefix demo run serve` starts in demo/
  if (process.cwd() !== APP_ROOT) process.chdir(APP_ROOT);
  const { createServer } = await import("vite"); // the repository's own Vite (root package.json)
  const idp = createIdp({ user });
  const api = { port: null };
  // Vite reads port 0 as "its default port"; take a free one from the OS instead
  if (!port) port = await freePort();
  const vite = await createServer({
    root: APP_ROOT,
    configFile: path.join(APP_ROOT, "vite.config.ts"),
    mode: "development",
    logLevel: "warn",
    clearScreen: false,
    plugins: [kitPlugin({ idp, api })],
    server: { host: "127.0.0.1", port, strictPort: true, open: false },
  });
  await vite.listen();
  const kitPort = vite.httpServer.address().port;
  // The API container fetches the stand-in provider's keys from http://host.docker.internal:<kitPort>. On a
  // Mac, Docker forwards that to this machine's loopback; on Linux it is the Docker bridge's gateway, where
  // the kit listens too, for the provider's public discovery document and keys only.
  let keysServer = null;
  if (process.platform === "linux") {
    try { keysServer = await serveKeysOnBridge(idp, kitPort); } catch (e) { await vite.close(); throw e; }
  }
  const project = `${PROJECT_PREFIX}${kitPort}`;
  const secrets = path.join(CACHE, `secrets-${kitPort}`);
  const env = { COMPOSE_PROJECT_NAME: project, DEMO_KIT_PORT: String(kitPort), DEMO_SECRETS_DIR: secrets, DEMO_API_TAG: image.tag };

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    sh("docker", [...composeArgs(project), "down", "--volumes", "--remove-orphans", "--timeout", "5"], { env, allowFail: true, quiet: true });
    if (keysServer) await new Promise((r) => keysServer.close(r));
    fs.rmSync(secrets, { recursive: true, force: true });
    fs.rmSync(path.join(CACHE, `serve-${kitPort}.pid`), { force: true });
    await vite.close();
  };

  try {
    // Throwaway passwords for this session's database only (loopback, gone on close)
    fs.mkdirSync(secrets, { recursive: true });
    for (const f of ["postgres-password", "app-role-password"]) {
      fs.writeFileSync(path.join(secrets, f), crypto.randomBytes(18).toString("base64url"), { mode: 0o644 });
    }
    log(`starting ${project}: Postgres, migrate, fixture seed, API (image workout-demo-api:${image.tag}${image.build ? ", building it first: the first build takes a few minutes" : ""})`);
    const t = Date.now();
    sh("docker", [...composeArgs(project), "up", "--detach", "--quiet-pull", image.build ? "--build" : "--no-build", "api"], { env });
    const mapped = sh("docker", [...composeArgs(project), "port", "api", "5000"], { env }).stdout.trim();
    api.port = Number(mapped.split(":").pop());
    await waitForHealth(api.port);
    log(`API healthy on 127.0.0.1:${api.port} after ${((Date.now() - t) / 1000).toFixed(0)} s; fixture user ${idp.user}`);
  } catch (e) {
    await close();
    throw e;
  }

  const url = `http://localhost:${kitPort}/`;
  return {
    url,
    project,
    apiPort: api.port,
    loadUrl: (query = "") => `http://localhost:${kitPort}${LOAD_PATH}${query ? "?q=" + encodeURIComponent(query) : ""}`,
    close,
  };
}

// Linux: the provider's discovery document and keys (GET only, nothing that issues tokens) on the Docker
// bridge's gateway address and the kit's port, so containers reach them as host.docker.internal.
async function serveKeysOnBridge(idp, port) {
  const host = bridgeGateway();
  const allowed = new Set([BASE_PATH + "/.well-known/openid-configuration", BASE_PATH + "/jwks"]);
  const s = http.createServer((req, res) => {
    const p = new URL(req.url, "http://x").pathname;
    if (req.method !== "GET" || !allowed.has(p)) { res.writeHead(404); return res.end(); }
    idp.handle(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
  try {
    await new Promise((resolve, reject) => { s.once("error", reject); s.listen(port, host, resolve); });
  } catch (e) {
    // Docker Desktop on Linux: the bridge is inside its VM, and it forwards host.docker.internal to this
    // machine's loopback, as on a Mac
    if (e.code === "EADDRNOTAVAIL") { log(`the Docker bridge (${host}) is not on this machine; relying on Docker's own host.docker.internal`); return null; }
    throw e;
  }
  log(`provider keys for the API container on ${host}:${port} (the Docker bridge)`);
  return s;
}

/** Stop every demo stack on this machine: serve.mjs processes started by hand, and their containers. */
export function stopAll() {
  let n = 0;
  if (fs.existsSync(CACHE)) {
    for (const f of fs.readdirSync(CACHE).filter((f) => /^serve-\d+\.pid$/.test(f))) {
      const pid = Number(fs.readFileSync(path.join(CACHE, f), "utf8"));
      try { process.kill(pid, "SIGTERM"); n++; log(`stopped serve.mjs (pid ${pid})`); } catch (e) { /* already gone */ }
      fs.rmSync(path.join(CACHE, f), { force: true });
    }
  }
  const r = spawnSync("docker", ["compose", "ls", "--all", "--format", "json"], { encoding: "utf8" });
  if (r.status !== 0) { log("Docker is not running: no demo containers to stop."); return n; }
  for (const p of JSON.parse(r.stdout || "[]").filter((p) => p.Name.startsWith(PROJECT_PREFIX))) {
    sh("docker", ["compose", "-p", p.Name, "down", "--volumes", "--remove-orphans", "--timeout", "5"], { allowFail: true });
    log(`removed ${p.Name}`);
    n++;
  }
  if (fs.existsSync(CACHE)) for (const d of fs.readdirSync(CACHE).filter((d) => d.startsWith("secrets-"))) fs.rmSync(path.join(CACHE, d), { recursive: true, force: true });
  const left = spawnSync("docker", ["ps", "-a", "--filter", `label=com.docker.compose.project`, "--format", "{{.Label \"com.docker.compose.project\"}}"], { encoding: "utf8" })
    .stdout.split("\n").filter((x) => x.startsWith(PROJECT_PREFIX));
  if (stopKitDockerd()) n++;
  log(left.length ? `still there: ${[...new Set(left)].join(", ")}` : `nothing of the demo kit is running${n ? "" : " (there was nothing to stop)"}.`);
  return n;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
  if (process.argv.includes("--stop")) {
    stopAll();
  } else {
    const srv = await start({ port: Number(arg("--port") ?? process.env.PORT ?? 8791), user: arg("--user") });
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(path.join(CACHE, `serve-${new URL(srv.url).port}.pid`), String(process.pid));
    console.log(`Workout demo (fixture user signed in, no platform sign-in): ${srv.loadUrl()}`);
    console.log(`Ctrl+C here, or \`node demo/kit/serve.mjs --stop\` from anywhere, stops the app and its containers.`);
    let stopping = false;
    const stop = async () => { if (stopping) return; stopping = true; console.log("\nstopping…"); await srv.close(); process.exit(0); };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  }
}
