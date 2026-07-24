# Homelab Deployment Guide

This repository publishes immutable OCI images for homelab deployment. The homelab must only pull and run prebuilt images.

## Runtime Config Contract (Frontend)

The frontend expects `/runtime-config/config.js` to be mounted read-only at runtime.

Required keys:
- `apiBaseUrl`
- `oidcAuthority`
- `oidcClientId`
- `oidcRedirectUri`

Optional keys:
- `environmentName`

See `/docs/runtime-config.md` for schema and examples.

## Runtime Secret Contract (API)

The API expects:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD_FILE`

The API reads the database password from the referenced file path at runtime.

## Container Runtime Hardening

Recommended runtime flags:
- Run as non-root (image default)
- `read_only: true`
- Frontend tmpfs: `/tmp/nginx` with `uid=10001,gid=10001,mode=1770`
- API tmpfs: `/tmp`
- File-mounted secrets only

## Local Smoke Test

```bash
cd deploy
docker compose up -d
```

Frontend health: `http://localhost:4173/health`  
API health: `http://localhost:5000/api/health`
