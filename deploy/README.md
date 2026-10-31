# Local full-stack environment

This directory contains the **local development** stack: frontend (nginx), API (ASP.NET Core), database (PostgreSQL), identity provider (Authentik), and reverse proxy (Traefik).

Deployed environments (prod, previews) run on the app platform from `../platform.toml`
(platform design §7); they use `Dockerfile.static` for the frontend and the platform's
Postgres, PgBouncer, Pocket ID and edge instead of the services below. The compose stack is
shaped like the platform where it matters: a one-shot `migrate` job runs as the database
owner, and the API connects as a separate NOBYPASSRLS runtime role through `DATABASE_URL`.

## Architecture

```
:80 → Traefik (file-based routing via traefik-dynamic.yml)
        ├── /api/*           → API container (:5000)        [priority 10]
        ├── /api/v3/*        → Authentik (:9000)            [priority 20]
        ├── /application/*   → Authentik (:9000)  (OIDC endpoints)
        ├── /.well-known/*   → Authentik (:9000)  (OIDC discovery)
        ├── /if/*            → Authentik (:9000)  (login UI)
        ├── /flows/*         → Authentik (:9000)  (auth/logout flows)
        ├── /static/*        → Authentik (:9000)  (login UI assets)
        ├── /ws/*            → Authentik (:9000)  (WebSocket)
        └── /*               → Frontend  (:4173)  (catch-all)   [priority 1]
```

## Services

| Service | Image | Purpose |
|---------|-------|---------|
| **traefik** | `traefik:v3.3` | Reverse proxy, file-based path routing (`traefik-dynamic.yml`) |
| **workout-app** | Built from `deploy/Dockerfile` | Static frontend (nginx) |
| **migrate** | Same image as `api` | One-shot `--migrate` job as the DB owner; grants `workout_rt` |
| **api** | Built from `server/Dockerfile` | ASP.NET Core sync API (runtime role `workout_rt`) |
| **db** | `postgres:18.6-alpine` | App data (user_data + RLS); `initdb/` creates `workout_rt` |
| **authentik-server** | `ghcr.io/goauthentik/server:2024.2` | OIDC identity provider |
| **authentik-worker** | Same as above | Background tasks |
| **authentik-db** | `postgres:16-alpine` | Authentik data |
| **authentik-redis** | `redis:7-alpine` | Authentik cache |

## Quick Start

```bash
cd deploy

# Start all services
docker compose up -d

# Wait for Authentik to be ready (~60-90s on first start)
# Then set up the OIDC provider (first time only)
bash ../scripts/setup-authentik.sh

# Verify everything works
bash ../scripts/test-docker-compose.sh
```

Visit http://localhost to use the app. Authentik admin: http://localhost/if/admin/ (default: akadmin / admin).

## Configuration

### Secrets (never committed)

Passwords are supplied as files, not environment variables. Create them before the first
`docker compose up`:

```bash
cd deploy
mkdir -p secrets
openssl rand -hex 24 > secrets/postgres-password
openssl rand -hex 24 > secrets/app-role-password
```

The runtime role is created from `secrets/app-role-password` when the database volume is
first initialised. Volumes from before the Postgres 18 / `workout_rt` switch are not
compatible (there is no real data yet): run `docker compose down -v` once.

`deploy/secrets/` is gitignored. The API reads the password from the mounted file and never
requires a secret-bearing environment variable.

### Non-secret environment

Copy `.env.example` to `.env` and adjust as needed (`deploy/.env` is gitignored):

```bash
cp .env.example .env
```

### Frontend runtime configuration

The frontend image is environment-agnostic — no domains, API URLs or OIDC identifiers are
baked in at build time. Deployment configuration is mounted at
`/usr/share/nginx/html/runtime-config.json` and read by the app at startup, so the *same*
image digest can serve multiple environments:

```json
{
  "apiBaseUrl": "",
  "deploymentMode": "production",
  "oidcAuthority": "https://auth.example.com/application/o/workout-app",
  "oidcClientId": "workout-app",
  "oidcRedirectUri": "https://workout.example.com/"
}
```

An empty `apiBaseUrl` means "same origin" (the Traefik setup above).
At container startup, the frontend validates `oidcAuthority` and restricts its
`connect-src` Content Security Policy to that authority's origin.

## Authentik OIDC Setup

The `scripts/setup-authentik.sh` script automates creating the OAuth2 provider, application, and enrollment flow in Authentik. It:

1. Waits for Authentik to be healthy
2. Finds the implicit-consent authorization flow
3. Discovers OAuth scope mappings and signing key
4. Creates a public OAuth2 provider (client_id: `workout-app`)
5. Creates the application linked to the provider
6. Creates an enrollment flow (sign-up) with username, email, and password
7. Links the enrollment flow to the login page
8. Verifies the OIDC discovery endpoint

Run it once after first `docker compose up`:
```bash
AUTHENTIK_URL=http://localhost AUTHENTIK_TOKEN=test-admin-token bash scripts/setup-authentik.sh
```

## Zero-Downtime Update

```bash
cd deploy
docker compose build
docker compose up -d
```

Compose uses healthchecks to keep the previous containers running until new ones are healthy.

## API Configuration

The API reads the platform's runtime contract (platform design §6b.1); compose sets the same
variables. Older `ConnectionStrings__*` / `Auth__*` keys remain as fallbacks for `dotnet run`.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | `postgres://<role>@<host>:<port>/<db>` — owner role for `--migrate`, runtime role for the API; **without** a password |
| `DATABASE_PASSWORD_FILE` | Path to the mounted file holding that role's password |
| `DATABASE_RUNTIME_ROLE` | `--migrate` only: role that receives the API's grants |
| `OIDC_ISSUER` / `Auth__Issuer` | JWT issuer URL (must match the token `iss`) |
| `OIDC_AUDIENCE` (or `OIDC_CLIENT_ID`) / `Auth__ClientId` | Required token audience (`workout-app-<env>` on the platform) |
| `PLATFORM_CA_FILE` | PEM bundle trusted for the IdP discovery/JWKS fetch (platform CA) |
| `PORT` | Listen port (default 5000 from the image) |
| `Auth__MetadataAddress` | Local compose only: OIDC discovery URL on the internal Docker network |

Commands: `dotnet server.dll --migrate` applies `server/Data/Schema.sql`;
`dotnet server.dll --seed fixture|sanitize` runs the preview seed scripts
(`server/Data/Seed/`). The API itself never migrates.

The split between `Auth__Issuer` and `Auth__MetadataAddress` allows the API to fetch signing keys from the internal Docker network (`http://authentik-server:9000/...`) while validating the external issuer URL (`http://localhost/...`) that appears in browser-issued JWTs.

## Notes

- Frontend: static build served by nginx with SPA fallback, security headers (CSP, XFO, etc.)
- API: validates JWTs against Authentik's JWKS endpoint, enforces PostgreSQL Row-Level Security
- The API connects as the non-superuser `workout_rt` role so RLS is actually enforced; only the
  `migrate` job uses the owner connection. The app never creates or alters roles.
- Both images run as numeric non-root users with read-only root filesystems and explicit tmpfs mounts
- Traefik uses file-based routing (`traefik-dynamic.yml`) with priority ordering (Authentik=20, API=10, Frontend=1)
- The `/api/v3` prefix is routed to Authentik (not the app API) for Authentik's internal API calls
- Health endpoints: frontend `/health`, API `/api/health`
- All data is isolated per-user via PostgreSQL RLS policies
