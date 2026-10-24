#!/bin/sh
# Local stand-in for the app platform (platform design §5.1, runtime_role = true): roles are
# created outside the app. The API connects as this NOBYPASSRLS role; the `migrate` service
# runs as the database owner and grants it access (server/Data/Schema.sql).
# Runs once, when the Postgres data volume is first initialised.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v rt_pw="$(cat /run/secrets/app-role-password)" <<'SQL'
CREATE ROLE workout_rt LOGIN PASSWORD :'rt_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
SQL
