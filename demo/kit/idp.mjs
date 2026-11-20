// A stand-in OpenID provider for demo sessions, served by the kit's own process under /__demo/oidc.
//
// Why: the app signs in with OIDC (Pocket ID on the platform, Authentik in deploy/), and its API only
// serves data to a signed-in user. A demo must run with no sign-in to the platform and no person at a
// login page, so the kit plays the identity provider for the fixture users of
// server/Data/Seed/fixture.sql and nobody else:
//
//   - issuer `urn:workout-app:fixture`, the fixture's own issuer, so the API resolves the token to the
//     fixture user exactly as it resolves a platform token to a real one (users keyed by issuer and
//     subject, record 0004);
//   - a fresh RSA key per run, never written to disk; the only API that trusts it is the demo
//     compose project's, which is told so through Auth__Issuer / Auth__MetadataAddress
//     (demo/kit/compose.yml). Deployed APIs trust only the platform's issuer and keys;
//   - authorization code + PKCE with no login page (the app's own sign-in button works), plus a
//     `urn:workout-app:demo` grant that the kit's load page uses to start signed in.
//
// No real person, password or credential is involved. See docs/decisions/0021-demo-kit.md.
import crypto from "node:crypto";

export const ISSUER = "urn:workout-app:fixture";
export const CLIENT_ID = "workout-app-demo";
export const BASE_PATH = "/__demo/oidc";
export const FIXTURE_USERS = ["gzclp-lifter", "ballet-dancer"];
export const DEMO_GRANT = "urn:workout-app:demo";

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const TOKEN_SECONDS = 8 * 3600;

export function createIdp({ user = FIXTURE_USERS[0] } = {}) {
  if (!FIXTURE_USERS.includes(user)) throw new Error(`Unknown fixture user "${user}" (fixture.sql has ${FIXTURE_USERS.join(", ")}).`);
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const kid = b64url(crypto.randomBytes(8));
  const jwk = { ...publicKey.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" };
  const codes = new Map();

  const sign = (claims) => {
    const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
    const body = b64url(JSON.stringify(claims));
    return `${head}.${body}.${b64url(crypto.sign("sha256", Buffer.from(`${head}.${body}`), privateKey))}`;
  };
  const tokens = (nonce) => {
    const iat = Math.floor(Date.now() / 1000);
    const base = { iss: ISSUER, sub: user, aud: CLIENT_ID, iat, nbf: iat - 5, exp: iat + TOKEN_SECONDS };
    return {
      token_type: "Bearer",
      expires_in: TOKEN_SECONDS,
      access_token: sign({ ...base, scope: "openid profile" }),
      // Like Pocket ID: no email in the access token. The ID token carries a display name only.
      id_token: sign({ ...base, ...(nonce ? { nonce } : {}), name: `Fixture ${user}` }),
    };
  };

  const json = (res, status, body) => {
    res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(body));
  };
  const readForm = (req) => new Promise((resolve, reject) => {
    let s = "";
    req.on("data", (c) => { s += c; if (s.length > 1e5) req.destroy(); });
    req.on("end", () => resolve(new URLSearchParams(s)));
    req.on("error", reject);
  });

  /** Handles a request under BASE_PATH; returns false if it isn't one. */
  async function handle(req, res) {
    const u = new URL(req.url, `http://${req.headers.host}`);
    if (!u.pathname.startsWith(BASE_PATH)) return false;
    const route = u.pathname.slice(BASE_PATH.length);
    // URLs are built from the Host the caller used: the browser comes in on localhost, the API's
    // container on host.docker.internal.
    const base = `http://${req.headers.host}${BASE_PATH}`;

    if (route === "/.well-known/openid-configuration") {
      return json(res, 200, {
        issuer: ISSUER,
        authorization_endpoint: `${base}/authorize`,
        token_endpoint: `${base}/token`,
        jwks_uri: `${base}/jwks`,
        end_session_endpoint: `${base}/logout`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", DEMO_GRANT],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: ["openid", "profile", "email"],
      }), true;
    }
    if (route === "/jwks") return json(res, 200, { keys: [jwk] }), true;

    if (route === "/authorize") {
      const q = u.searchParams;
      const redirect = q.get("redirect_uri") || "";
      // Only back to the kit's own origin: this provider never sends a code anywhere else
      if (q.get("client_id") !== CLIENT_ID || new URL(redirect, base).origin !== new URL(base).origin || q.get("code_challenge_method") !== "S256") {
        return json(res, 400, { error: "invalid_request" }), true;
      }
      const code = b64url(crypto.randomBytes(18));
      codes.set(code, { challenge: q.get("code_challenge"), redirect, nonce: q.get("nonce"), at: Date.now() });
      const to = new URL(redirect);
      to.searchParams.set("code", code);
      if (q.get("state")) to.searchParams.set("state", q.get("state"));
      res.writeHead(302, { location: to.toString(), "cache-control": "no-store" });
      return res.end(), true;
    }

    if (route === "/token" && req.method === "POST") {
      const f = await readForm(req);
      if (f.get("client_id") !== CLIENT_ID) return json(res, 400, { error: "invalid_client" }), true;
      if (f.get("grant_type") === DEMO_GRANT) return json(res, 200, tokens(null)), true;
      if (f.get("grant_type") === "authorization_code") {
        const c = codes.get(f.get("code") || "");
        codes.delete(f.get("code") || "");
        const verifier = f.get("code_verifier") || "";
        if (!c || Date.now() - c.at > 60_000 || c.redirect !== f.get("redirect_uri") ||
            b64url(crypto.createHash("sha256").update(verifier).digest()) !== c.challenge) {
          return json(res, 400, { error: "invalid_grant" }), true;
        }
        return json(res, 200, tokens(c.nonce)), true;
      }
      return json(res, 400, { error: "unsupported_grant_type" }), true;
    }

    if (route === "/logout") {
      const back = u.searchParams.get("post_logout_redirect_uri");
      const to = back && new URL(back, base).origin === new URL(base).origin ? back : "/";
      res.writeHead(302, { location: to });
      return res.end(), true;
    }
    return json(res, 404, { error: "not_found" }), true;
  }

  return { handle, user };
}
