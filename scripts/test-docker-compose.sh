#!/bin/bash
# Integration test for the full docker-compose stack.
# Verifies all services start, are healthy, and respond correctly.
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE_FILE="deploy/docker-compose.yml"

cleanup() {
  echo "Cleaning up..."
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

echo "=== Starting full stack ==="
docker compose -f "$COMPOSE_FILE" up -d --build

# Wait for a service to become healthy
wait_healthy() {
  local service="$1"
  local timeout="${2:-120}"
  echo "Waiting for ${service} to be healthy (timeout: ${timeout}s)..."
  local elapsed=0
  while [ "$elapsed" -lt "$timeout" ]; do
    local health
    health=$(docker compose -f "$COMPOSE_FILE" ps --format json "$service" 2>/dev/null | python3 -c "import sys,json; data=json.load(sys.stdin); print(data.get('Health',''))" 2>/dev/null || echo "")
    if [ "$health" = "healthy" ]; then
      echo "  ${service} is healthy (${elapsed}s)"
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done
  echo "ERROR: ${service} not healthy after ${timeout}s"
  docker compose -f "$COMPOSE_FILE" logs "$service" --tail 30
  return 1
}

# Wait for core services
wait_healthy db 60
wait_healthy api 90
wait_healthy workout-app 90

# Wait for Authentik (heavyweight, needs more time)
echo "Waiting for Authentik to be ready..."
AUTHENTIK_READY=false
for i in $(seq 1 60); do
  if curl -sf "http://localhost/-/health/ready/" > /dev/null 2>&1; then
    AUTHENTIK_READY=true
    echo "  Authentik is ready (${i}x3s)"
    break
  fi
  sleep 3
done
if [ "$AUTHENTIK_READY" != "true" ]; then
  echo "ERROR: Authentik not ready after 180s"
  docker compose -f "$COMPOSE_FILE" logs authentik-server --tail 30
  exit 1
fi

echo ""
echo "=== Running health checks ==="

# Test 1: Frontend reachable
STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/)
if [ "$STATUS" = "200" ]; then
  echo "PASS: Frontend returned 200"
else
  echo "FAIL: Frontend returned $STATUS (expected 200)"
  exit 1
fi

# Test 2: API health endpoint
STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health)
if [ "$STATUS" = "200" ]; then
  echo "PASS: API health returned 200"
else
  echo "FAIL: API health returned $STATUS (expected 200)"
  exit 1
fi

# Test 3: API rejects unauthenticated sync requests
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost/api/sync/pull?since=2000-01-01T00:00:00Z")
if [ "$STATUS" = "401" ]; then
  echo "PASS: API sync returned 401 (unauthenticated)"
else
  echo "FAIL: API sync returned $STATUS (expected 401)"
  exit 1
fi

# Test 4: Set up Authentik OIDC provider
echo ""
echo "=== Setting up Authentik OIDC ==="
bash scripts/setup-authentik.sh

# Test 5: OIDC discovery endpoint
STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/application/o/workout-app/.well-known/openid-configuration)
if [ "$STATUS" = "200" ]; then
  echo "PASS: OIDC discovery returned 200"
else
  echo "FAIL: OIDC discovery returned $STATUS (expected 200)"
  exit 1
fi

echo ""
echo "=== All docker-compose health checks passed ==="
