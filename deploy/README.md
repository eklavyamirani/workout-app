# Deployment Guide

This directory contains the full-stack deployment configuration: frontend (nginx), API (ASP.NET Core), database (PostgreSQL), identity provider (Authentik), and reverse proxy (Traefik).

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
| **api** | Built from `server/Dockerfile` | ASP.NET Core sync API |
| **db** | `postgres:16-alpine` | App data (user_data + RLS) |
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

The API container accepts these environment variables:

| Variable | Purpose |
|----------|---------|
| `ConnectionStrings__Default` | PostgreSQL connection info for the runtime (non-superuser) role — **without** a password |
| `ConnectionStrings__Default__PasswordFile` | Path to the mounted file holding the runtime role password |
| `ConnectionStrings__Admin` | Optional administrative connection used only for schema/role bootstrap |
| `ConnectionStrings__Admin__PasswordFile` | Path to the mounted file holding the administrative password |
| `Database__AppRolePasswordFile` | Path to the file whose contents become the `workout_app` role password |
| `Auth__Issuer` | JWT issuer URL (external, matches token `iss` claim) |
| `Auth__MetadataAddress` | OIDC discovery URL (internal, for JWKS fetching) |
| `Auth__ClientId` | OIDC client ID (audience validation) |

The split between `Auth__Issuer` and `Auth__MetadataAddress` allows the API to fetch signing keys from the internal Docker network (`http://authentik-server:9000/...`) while validating the external issuer URL (`http://localhost/...`) that appears in browser-issued JWTs.

## Notes

- Frontend: static build served by nginx with SPA fallback, security headers (CSP, XFO, etc.)
- API: validates JWTs against Authentik's JWKS endpoint, enforces PostgreSQL Row-Level Security
- The API connects as the non-superuser `workout_app` role so RLS is actually enforced; the
  superuser connection is used only for schema and role bootstrap
- Both images run as numeric non-root users with read-only root filesystems and explicit tmpfs mounts
- Traefik uses file-based routing (`traefik-dynamic.yml`) with priority ordering (Authentik=20, API=10, Frontend=1)
- The `/api/v3` prefix is routed to Authentik (not the app API) for Authentik's internal API calls
- Health endpoints: frontend `/health`, API `/api/health`
- All data is isolated per-user via PostgreSQL RLS policies
