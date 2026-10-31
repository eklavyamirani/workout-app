#!/bin/bash
# Smoke test: run the API image the way the app platform will (runtime contract v1, platform
# docs/design.md §6b.1) and check the contract from outside. Not a substitute for the
# platform's end-to-end deploy; it catches image/contract mismatches before that.
#
#   1. "platform": Postgres 18, DB owned by a NOSUPERUSER/NOCREATEROLE role, NOBYPASSRLS _rt role,
#      CONNECT revoked from PUBLIC; PgBouncer in transaction mode (db.platform:6432 stand-in)
#   2. migration job: `dotnet server.dll --migrate` exec'd directly (the platform uses /bin/sh -c
#      only for commands with shell syntax) as the owner, with DATABASE_RUNTIME_ROLE, through the
#      pooler (platform.toml [database])
#   3. API pod: runtime role, DATABASE_URL without password + password file under
#      /run/secrets/platform, PORT, OIDC_*, read-only root fs + /tmp tmpfs, uid 10001, no caps
#   4. checks: /api/health healthy, unauthenticated sync 401, runtime role cannot change schema
set -euo pipefail

cd "$(dirname "$0")/.."

POSTGRES_IMAGE=postgres:18.6-alpine
PGBOUNCER_IMAGE=edoburu/pgbouncer:v1.26.1-p0
API_IMAGE=workout-app-api:contract-test
P="wa-contract-$$"
DB=workout_app_prod
OWNER=$DB
RT=${DB}_rt

cleanup() {
  docker rm -f "$P-db" "$P-pgb" "$P-api" >/dev/null 2>&1 || true
  docker volume rm "$P-owner" "$P-rt" >/dev/null 2>&1 || true
  docker network rm "$P" >/dev/null 2>&1 || true
}
trap cleanup EXIT

pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*"; exit 1; }

SU_PW=$(openssl rand -hex 16)
OWNER_PW=$(openssl rand -hex 16)
RT_PW=$(openssl rand -hex 16)

echo "=== Building API image ==="
docker build -q -t "$API_IMAGE" server >/dev/null

echo "=== Platform stand-in: Postgres 18 + roles + PgBouncer (transaction mode) ==="
docker network create "$P" >/dev/null
docker run -d --name "$P-db" --network "$P" --network-alias db \
  -e POSTGRES_PASSWORD="$SU_PW" "$POSTGRES_IMAGE" >/dev/null
for _ in $(seq 1 60); do
  docker exec "$P-db" pg_isready -U postgres -q 2>/dev/null && break
  sleep 1
done
# The image's init restarts the server once; wait for the final instance.
sleep 2
for _ in $(seq 1 30); do
  docker exec "$P-db" pg_isready -U postgres -q 2>/dev/null && break
  sleep 1
done

docker exec -i "$P-db" psql -v ON_ERROR_STOP=1 -q -U postgres \
  -v owner="$OWNER" -v owner_pw="$OWNER_PW" -v rt="$RT" -v rt_pw="$RT_PW" -v db="$DB" <<'SQL'
CREATE ROLE :"owner" LOGIN PASSWORD :'owner_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE ROLE :"rt" LOGIN PASSWORD :'rt_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE DATABASE :"db" OWNER :"owner";
REVOKE CONNECT ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO :"rt";
SQL

PGB_INI="[databases]
* = host=db port=5432
[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
default_pool_size = 2
ignore_startup_parameters = extra_float_digits,options"
PGB_USERS="\"$OWNER\" \"$OWNER_PW\"
\"$RT\" \"$RT_PW\""
docker run -d --name "$P-pgb" --network "$P" --network-alias pgbouncer \
  -e PGB_INI="$PGB_INI" -e PGB_USERS="$PGB_USERS" --entrypoint /bin/sh "$PGBOUNCER_IMAGE" \
  -c 'printf "%s\n" "$PGB_INI" > /etc/pgbouncer/pgbouncer.ini && printf "%s\n" "$PGB_USERS" > /etc/pgbouncer/userlist.txt && exec pgbouncer /etc/pgbouncer/pgbouncer.ini' \
  >/dev/null

# Secrets as files, readable by the pod's uid only (the platform mounts them the same way).
for who in owner rt; do
  pw=$OWNER_PW; [ "$who" = rt ] && pw=$RT_PW
  docker volume create "$P-$who" >/dev/null
  docker run --rm -v "$P-$who:/s" -e PW="$pw" "$POSTGRES_IMAGE" \
    sh -c 'printf "%s" "$PW" > /s/DATABASE_PASSWORD && chown 10001:10001 /s/DATABASE_PASSWORD && chmod 0400 /s/DATABASE_PASSWORD'
done

POD_FLAGS=(--network "$P" --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m
  --user 10001:10001 --cap-drop ALL --security-opt no-new-privileges)

echo "=== Migration job (owner, through the pooler) ==="
docker run --rm "${POD_FLAGS[@]}" -v "$P-owner:/run/secrets/platform:ro" \
  -e DATABASE_URL="postgres://$OWNER@pgbouncer:6432/$DB" \
  -e DATABASE_PASSWORD_FILE=/run/secrets/platform/DATABASE_PASSWORD \
  -e DATABASE_RUNTIME_ROLE="$RT" \
  --entrypoint dotnet "$API_IMAGE" server.dll --migrate \
  && pass "migration job exited 0" || fail "migration job"

echo "=== API pod (runtime role) ==="
docker run -d --name "$P-api" "${POD_FLAGS[@]}" -v "$P-rt:/run/secrets/platform:ro" \
  -p 127.0.0.1::5000 \
  -e DATABASE_URL="postgres://$RT@pgbouncer:6432/$DB" \
  -e DATABASE_PASSWORD_FILE=/run/secrets/platform/DATABASE_PASSWORD \
  -e PORT=5000 \
  -e OIDC_ISSUER=https://id.plat.test \
  -e OIDC_CLIENT_ID=workout-app-prod -e OIDC_AUDIENCE=workout-app-prod \
  -e PLATFORM_APP=workout-app -e PLATFORM_ENV=production -e PLATFORM_ENV_NAME=prod \
  "$API_IMAGE" >/dev/null
API="http://$(docker port "$P-api" 5000/tcp | head -1)"

BODY=""
for _ in $(seq 1 60); do
  BODY=$(curl -fsS "$API/api/health" 2>/dev/null || true)
  [ -n "$BODY" ] && break
  sleep 1
done
echo "$BODY" | grep -q '"status":"healthy"' && pass "/api/health: $BODY" \
  || { docker logs "$P-api" | tail -30; fail "/api/health: '$BODY'"; }

STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/sync/pull")
[ "$STATUS" = "401" ] && pass "unauthenticated /api/sync/pull → 401" || fail "unauthenticated pull → $STATUS"

echo "=== Runtime role least privilege (through the pooler) ==="
RT_URL="postgresql://$RT:$RT_PW@pgbouncer:6432/$DB"
for ddl in "ALTER TABLE user_data DISABLE ROW LEVEL SECURITY" "DROP TABLE users" "CREATE TABLE public.x (id int)"; do
  if OUT=$(docker run --rm --network "$P" "$POSTGRES_IMAGE" psql "$RT_URL" -v ON_ERROR_STOP=1 -qc "$ddl" 2>&1); then
    fail "runtime role could run: $ddl"
  fi
  # Must be a privilege error, not e.g. a connection failure.
  echo "$OUT" | grep -Eq "must be owner|permission denied" \
    && pass "runtime role denied: $ddl ($(echo "$OUT" | grep -Eo '(must be owner|permission denied)[^"]*' | head -1))" \
    || fail "unexpected error for '$ddl': $OUT"
done
ROWS=$(docker run --rm --network "$P" "$POSTGRES_IMAGE" psql "$RT_URL" -tAc "SELECT count(*) FROM user_data")
[ "$ROWS" = "0" ] && pass "runtime role reads user_data under RLS (0 rows without user context)" \
  || fail "user_data count without context: $ROWS"

echo ""
echo "=== All contract smoke checks passed ==="
