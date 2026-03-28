# Deployment Guide

This directory contains the full-stack deployment configuration: frontend (nginx), API (ASP.NET Core), database (PostgreSQL), identity provider (Authentik), and reverse proxy (Traefik).

## Architecture

```
:80 → Traefik
        ├── /api/*          → API container (:5000)
        ├── /application/*  → Authentik (:9000)  (OIDC endpoints)
        ├── /.well-known/*  → Authentik (:9000)  (OIDC discovery)
        ├── /if/*           → Authentik (:9000)  (login UI)
        └── /*              → Frontend  (:4173)  (catch-all)
```

## Services

| Service | Image | Purpose |
|---------|-------|---------|
| **traefik** | `traefik:v3.0` | Reverse proxy, path-based routing |
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

Visit http://localhost to use the app. Authentik admin: http://localhost/if/admin/ (default: admin / admin).

## Configuration

Environment variables are set in `.env` (defaults provided):

```bash
# App database
DB_PASSWORD=workout

# Authentik
AUTHENTIK_SECRET_KEY=change-me-in-production
AUTHENTIK_DB_PASSWORD=authentik
AUTHENTIK_BOOTSTRAP_PASSWORD=admin
AUTHENTIK_BOOTSTRAP_EMAIL=admin@localhost
AUTHENTIK_BOOTSTRAP_TOKEN=test-admin-token

# Frontend OIDC config (baked into build)
VITE_OIDC_AUTHORITY=http://localhost/application/o/workout-app
VITE_OIDC_CLIENT_ID=workout-app
VITE_OIDC_REDIRECT_URI=http://localhost/
```

For production, change all passwords and the `AUTHENTIK_SECRET_KEY`.

## Authentik OIDC Setup

The `scripts/setup-authentik.sh` script automates creating the OAuth2 provider and application in Authentik. It:

1. Waits for Authentik to be healthy
2. Finds the default authorization flow
3. Creates a public OAuth2 provider (client_id: `workout-app`)
4. Creates the application linked to the provider
5. Verifies the OIDC discovery endpoint

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
| `ConnectionStrings__Default` | PostgreSQL connection string |
| `Auth__Issuer` | JWT issuer URL (external, matches token `iss` claim) |
| `Auth__MetadataAddress` | OIDC discovery URL (internal, for JWKS fetching) |
| `Auth__ClientId` | OIDC client ID (audience validation) |

The split between `Auth__Issuer` and `Auth__MetadataAddress` allows the API to fetch signing keys from the internal Docker network (`http://authentik-server:9000/...`) while validating the external issuer URL (`http://localhost/...`) that appears in browser-issued JWTs.

## Notes

- Frontend: static build served by nginx with SPA fallback, security headers (CSP, XFO, etc.)
- API: validates JWTs against Authentik's JWKS endpoint, enforces PostgreSQL Row-Level Security
- Traefik routes by path prefix with priority ordering (Authentik=20, API=10, Frontend=1)
- Health endpoints: frontend `/health`, API `/api/health`
- All data is isolated per-user via PostgreSQL RLS policies
