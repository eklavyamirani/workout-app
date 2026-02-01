# Deployment Guide

This directory contains production-ready containerization and zero-downtime deployment configuration for the Workout Tracker app. Deployment assets live here (outside `.devcontainer`) as required.

## Prerequisites
- Docker (with BuildKit enabled) and Docker Compose v2
- Optional: a reverse proxy/ingress for TLS in production

## Configuration via Environment Variables
- `PORT` — container listen port (fixed at `4173` in the container; map host ports as needed)
- `DEPLOYMENT_MODE` — deployment environment label (e.g. `production`, `staging`, `dev`). Surfaced in the UI.
- **Secrets** — inject at runtime via environment variables (e.g., `API_KEY`, `ANALYTICS_TOKEN`). Do not bake secrets into images.

## Build and Run Locally
```bash
cd deploy
docker compose build
docker compose up -d
```
Visit http://localhost:4173 to view the app. Health endpoint: http://localhost:4173/health

## Production Zero-Downtime Rolling Update
1) Build new image
```bash
cd deploy
docker compose build
```
2) Start/Update with Compose (rolling, keeps old container until new is healthy)
```bash
docker compose up -d
```
Compose uses the healthcheck on `/health` to keep the previous container running until the new one is healthy, minimizing downtime.

## Alternative: Docker Run
```bash
docker build -t workout-app:latest -f deploy/Dockerfile .
docker run -d -p 4173:4173 -e PORT=4173 -e DEPLOYMENT_MODE=production workout-app:latest
```

## Notes
- Static build served by nginx; SPA fallback configured.
- Healthcheck endpoint exposed at `/health`.
- Container includes Docker `HEALTHCHECK` probing `/health`.
- Ports: container listens on 4173; map host/ingress ports to 4173 as needed. `DEPLOYMENT_MODE` remains configurable via env vars. When running behind a reverse proxy/ingress (for TLS or domain routing), route traffic to container port 4173. Security headers (CSP, XFO, etc.) remain compatible with reverse proxies; extend CSP `connect-src` only if your frontend must call additional origins.
