// Docker for the demo kit, on a Mac and on a Linux machine (a cloud session's container included).
//
//   ensureDocker()          the daemon answers, or, on Linux as root with dockerd installed and no daemon
//                           running, the kit starts dockerd itself (logged to demo/.cache/dockerd.log;
//                           `serve.mjs --stop` stops it again). Otherwise a message that says what to run.
//   stopKitDockerd()        stops a dockerd this kit started (only that one).
//   bridgeGateway()         Linux: the address `host-gateway` (host.docker.internal) resolves to in
//                           containers, i.e. the default bridge's gateway on this machine.
//   proxyBuild()            Linux behind an HTTP(S) proxy, or with a CA bundle to trust (DEMO_CA_BUNDLE):
//                           how to build the API image there (see buildApiImage).
//   buildApiImage(tag, pb)  builds server/Dockerfile unchanged, with the proxy settings, on the host
//                           network (a proxy on 127.0.0.1 is reachable from the build), and the CA added
//                           to the .NET SDK build stage through a named build context.
//
// It never changes the machine's network rules (no iptables) and never installs anything.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(HERE, "../..");
const CACHE = path.resolve(HERE, "../.cache");
const DOCKERD_PID = path.join(CACHE, "dockerd.pid");
const SDK_IMAGE = "mcr.microsoft.com/dotnet/sdk:8.0"; // the build stage's FROM in server/Dockerfile
const log = (...a) => console.error("[kit]", ...a);

const daemonUp = () => spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], { encoding: "utf8" }).status === 0;
const has = (cmd) => spawnSync("sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" }).status === 0;
const isRoot = () => typeof process.getuid === "function" && process.getuid() === 0;

export async function ensureDocker() {
  if (!has("docker")) {
    throw new Error("The docker command is missing. The demo kit runs Postgres and the API in Docker. On macOS: " +
      "`mise install` (colima and docker-cli come from mise), then `colima start`. On Linux: install Docker Engine " +
      "(docker-ce or docker.io, with the compose plugin).");
  }
  if (daemonUp()) return;
  if (process.platform === "darwin") {
    throw new Error("Docker is not running. On macOS run `colima start` (colima and docker-cli come from mise), or start " +
      "Docker Desktop, then try again.");
  }
  if (process.platform === "linux" && isRoot() && has("dockerd")) {
    fs.mkdirSync(CACHE, { recursive: true });
    const out = fs.openSync(path.join(CACHE, "dockerd.log"), "a");
    log("Docker isn't running; starting dockerd (log: demo/.cache/dockerd.log; `node demo/kit/serve.mjs --stop` stops it)");
    // The daemon inherits this process's environment, so HTTP(S)_PROXY / NO_PROXY apply to its image pulls
    const d = spawn("dockerd", [], { detached: true, stdio: ["ignore", out, out] });
    d.unref();
    fs.writeFileSync(DOCKERD_PID, String(d.pid));
    for (let i = 0; i < 60; i++) {
      if (daemonUp()) { log(`dockerd is up (pid ${d.pid})`); return; }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error("Started dockerd, but it did not answer within 60 s; see demo/.cache/dockerd.log.");
  }
  throw new Error("Docker is not running. Start it (for example `sudo systemctl start docker`, or `sudo dockerd &` " +
    "where there is no init system), then try again. As root on Linux, with dockerd installed, the kit starts it itself.");
}

export function stopKitDockerd() {
  if (!fs.existsSync(DOCKERD_PID)) return false;
  const pid = Number(fs.readFileSync(DOCKERD_PID, "utf8"));
  fs.rmSync(DOCKERD_PID, { force: true });
  try { process.kill(pid, "SIGTERM"); } catch { return false; }
  log(`stopped the dockerd the kit started (pid ${pid})`);
  return true;
}

export function bridgeGateway() {
  const r = spawnSync("docker", ["network", "inspect", "bridge", "--format", "{{range .IPAM.Config}}{{.Gateway}} {{end}}"], { encoding: "utf8" });
  const ip = (r.stdout || "").trim().split(/\s+/).find((x) => /^\d+\.\d+\.\d+\.\d+$/.test(x));
  if (r.status !== 0 || !ip) throw new Error("Can't find the Docker bridge's gateway address (`docker network inspect bridge`).");
  return ip;
}

// A CA bundle to trust in the API build: DEMO_CA_BUNDLE, else the one the environment points tools at.
function caBundle(env) {
  for (const k of ["DEMO_CA_BUNDLE", "SSL_CERT_FILE", "NODE_EXTRA_CA_CERTS", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"]) {
    if (env[k] && fs.existsSync(env[k])) return { file: env[k], from: k };
  }
  return null;
}
const PROXY_KEYS = ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy"];

/** null where the normal compose build works (every Mac, Linux without a proxy or CA bundle). */
export function proxyBuild(env = process.env) {
  if (process.platform !== "linux" && !env.DEMO_CA_BUNDLE) return null;
  const proxy = Object.fromEntries(PROXY_KEYS.filter((k) => env[k]).map((k) => [k, env[k]]));
  const ca = caBundle(env);
  if (!Object.keys(proxy).length && !(env.DEMO_CA_BUNDLE && ca)) return null;
  return { proxy, ca };
}

/** Build workout-demo-api:<tag> from server/Dockerfile as it is, for a machine behind a proxy. */
export function buildApiImage(tag, pb) {
  const args = ["build", "--network", "host", "-t", `workout-demo-api:${tag}`];
  for (const [k, v] of Object.entries(pb.proxy)) args.push("--build-arg", `${k}=${v}`);
  let tmp = null;
  if (pb.ca) {
    // The SDK image plus the CA, used in place of the SDK in server/Dockerfile's build stage (a named build
    // context overrides that FROM), so dotnet restore trusts the proxy. The runtime stage is unchanged.
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "workout-demo-sdk-"));
    fs.copyFileSync(pb.ca.file, path.join(tmp, "extra-ca.crt"));
    fs.writeFileSync(path.join(tmp, "Dockerfile"), `FROM ${SDK_IMAGE}
COPY extra-ca.crt /usr/local/share/ca-certificates/workout-demo-extra-ca.crt
RUN update-ca-certificates
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
`);
    log(`building the .NET SDK image with the CA from ${pb.ca.from} (${pb.ca.file})`);
    run(["build", "--network", "host", "-t", "workout-demo-sdk-ca:8.0", tmp]);
    args.push("--build-context", `${SDK_IMAGE}=docker-image://workout-demo-sdk-ca:8.0`);
  }
  log(`building workout-demo-api:${tag} behind the proxy (${Object.keys(pb.proxy).filter((k) => k === k.toUpperCase()).join(", ") || "no proxy variables"}${pb.ca ? ", extra CA" : ""})`);
  try {
    run([...args, path.join(APP_ROOT, "server")], { DOCKER_BUILDKIT: "1" });
  } finally {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function run(args, env = {}) {
  const r = spawnSync("docker", args, { stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`docker ${args.slice(0, 2).join(" ")} … failed (${r.status}); see the output above.`);
}
