-- Sync API for PostgREST (app-platform record 0046): the same requests and
-- responses as the .NET API's /api/sync/push and /api/sync/pull
-- (server/Endpoints/SyncEndpoints.cs), as functions in schema "api", the only
-- schema PostgREST exposes:
--
--   POST /api/rpc/sync_push  {"changes": [...]}   -> {"results": [...], "serverTime": "..."}
--   GET  /api/rpc/sync_pull?since=<ISO 8601>      -> {"changes": [...], "serverTime": "..."}
--
-- PostgREST verifies the access token (Pocket ID's keys, aud = this app's
-- client) and runs each request in one transaction as the runtime role, with
-- the token's claims in request.jwt.claims. As in UserResolverMiddleware.cs,
-- the user is the token's (iss, sub); unlike it, a user row is only created
-- by a push (GET requests run read-only), so a new user's first pull is empty
-- either way.

CREATE SCHEMA IF NOT EXISTS api;
REVOKE ALL ON SCHEMA api FROM PUBLIC;

-- users.id of the caller; with p_create, creates the row on first use. No
-- iss/sub in the claims (no token) -> HTTP 401.
CREATE OR REPLACE FUNCTION public.sync_user(p_create boolean) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  v_iss text := nullif(claims->>'iss', '');
  v_sub text := nullif(claims->>'sub', '');
  v_email text := nullif(claims->>'email', '');
  v_id uuid;
BEGIN
  IF v_iss IS NULL OR v_sub IS NULL THEN
    RAISE SQLSTATE 'PT401' USING MESSAGE = 'Sign-in required';
  END IF;
  SELECT id INTO v_id FROM users WHERE issuer = v_iss AND subject = v_sub;
  IF v_id IS NOT NULL OR NOT p_create THEN
    RETURN v_id;
  END IF;
  -- One-time bridge: a row created when users were keyed by email is claimed
  -- by the first identity presenting that email.
  IF v_email IS NOT NULL THEN
    UPDATE users SET issuer = v_iss, subject = v_sub
    WHERE id = (SELECT id FROM users WHERE subject IS NULL AND email = v_email LIMIT 1)
      AND subject IS NULL -- re-checked after a concurrent link: first one wins
    RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;
  -- ON CONFLICT covers two first requests racing for the same identity.
  INSERT INTO users (issuer, subject, email) VALUES (v_iss, v_sub, v_email)
  ON CONFLICT (issuer, subject) DO UPDATE SET email = coalesce(EXCLUDED.email, users.email)
  RETURNING id INTO v_id;
  RETURN v_id;
END
$$;

-- Timestamps in responses: UTC, ISO 8601, as the .NET API's "o" format.
CREATE OR REPLACE FUNCTION public.sync_time(t timestamptz) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT to_char(t AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
$$;

-- Applies a batch of changes atomically (one request = one transaction).
-- Per item: version 0 inserts, otherwise an update that expects that
-- version; a lost race or stale version is a "conflict" with the current
-- value; an empty key or unparsable updatedAt is an "error" for that item.
CREATE OR REPLACE FUNCTION api.sync_push(changes jsonb) RETURNS jsonb
LANGUAGE plpgsql SET timezone = 'UTC' AS $$
DECLARE
  v_uid uuid := public.sync_user(true);
  c jsonb;
  v_key text;
  v_version integer;
  v_deleted boolean;
  v_client timestamptz;
  v_new integer;
  v_cur record;
  results jsonb := '[]';
BEGIN
  IF jsonb_typeof(changes) IS DISTINCT FROM 'array' THEN
    RAISE SQLSTATE 'PT400' USING MESSAGE = 'changes must be an array';
  END IF;
  -- Row-level security context for this transaction (as UserScope.cs).
  PERFORM set_config('app.current_user_id', v_uid::text, true);

  FOR c IN SELECT value FROM jsonb_array_elements(changes) LOOP
    IF jsonb_typeof(c) IS DISTINCT FROM 'object' OR NOT c ? 'value' THEN
      RAISE SQLSTATE 'PT400' USING MESSAGE = 'each change needs key, value and updatedAt';
    END IF;
    v_key := c->>'key';
    v_version := coalesce((c->>'version')::integer, 0);
    v_deleted := coalesce((c->>'deleted')::boolean, false);

    IF v_key IS NULL OR v_key = '' THEN
      results := results || jsonb_build_object('key', coalesce(v_key, ''), 'status', 'error', 'version', 0);
      CONTINUE;
    END IF;

    -- The client clock is untrusted input: an unparsable value fails this item only.
    BEGIN
      v_client := (c->>'updatedAt')::timestamptz;
    EXCEPTION WHEN others THEN
      v_client := NULL;
    END;
    IF v_client IS NULL OR NOT isfinite(v_client) THEN
      results := results || jsonb_build_object('key', v_key, 'status', 'error', 'version', v_version);
      CONTINUE;
    END IF;

    v_new := NULL;
    -- updated_at is assigned server-side so a skewed client clock cannot
    -- write a row behind another device's pull watermark.
    IF v_version = 0 THEN
      INSERT INTO user_data (user_id, key, value, version, updated_at, client_updated_at, deleted)
      VALUES (v_uid, v_key, c->'value', 1, now(), v_client, v_deleted)
      ON CONFLICT (user_id, key) DO NOTHING
      RETURNING version INTO v_new;
    ELSE
      UPDATE user_data
      SET value = c->'value', version = version + 1, updated_at = now(),
          client_updated_at = v_client, deleted = v_deleted
      WHERE user_id = v_uid AND key = v_key AND version = v_version
      RETURNING version INTO v_new;
    END IF;

    IF v_new IS NOT NULL THEN
      results := results || jsonb_build_object('key', v_key, 'status', 'ok', 'version', v_new);
      CONTINUE;
    END IF;
    SELECT value, version INTO v_cur FROM user_data WHERE user_id = v_uid AND key = v_key;
    IF FOUND THEN
      results := results || jsonb_build_object('key', v_key, 'status', 'conflict', 'version', v_cur.version, 'value', v_cur.value);
    ELSE
      results := results || jsonb_build_object('key', v_key, 'status', 'error', 'version', 0);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('results', results, 'serverTime', public.sync_time(clock_timestamp()));
END
$$;

-- Changes after the watermark "since" (default: everything), oldest first.
CREATE OR REPLACE FUNCTION api.sync_pull(since text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SET timezone = 'UTC' AS $$
DECLARE
  v_uid uuid := public.sync_user(false);
  v_since timestamptz := '-infinity';
  v_changes jsonb := '[]';
BEGIN
  IF nullif(since, '') IS NOT NULL THEN
    BEGIN
      v_since := since::timestamptz;
    EXCEPTION WHEN others THEN
      RAISE SQLSTATE 'PT400' USING MESSAGE = 'Invalid ''since'' timestamp';
    END;
  END IF;
  IF v_uid IS NOT NULL THEN
    PERFORM set_config('app.current_user_id', v_uid::text, true);
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'key', key, 'value', value, 'version', version,
             'updatedAt', public.sync_time(updated_at), 'deleted', deleted) ORDER BY updated_at), '[]')
    INTO v_changes
    FROM user_data
    WHERE user_id = v_uid AND updated_at > v_since;
  END IF;
  RETURN jsonb_build_object('changes', v_changes, 'serverTime', public.sync_time(clock_timestamp()));
END
$$;

-- === Runtime role grants (the role PostgREST runs as) ===
REVOKE ALL ON FUNCTION public.sync_user(boolean), public.sync_time(timestamptz),
  api.sync_push(jsonb), api.sync_pull(text) FROM PUBLIC;
DO $$
DECLARE
  rt text := nullif(current_setting('app.runtime_role', true), '');
BEGIN
  IF rt IS NULL THEN
    RETURN;
  END IF;
  EXECUTE format('GRANT USAGE ON SCHEMA api TO %I', rt);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.sync_user(boolean), public.sync_time(timestamptz),
    api.sync_push(jsonb), api.sync_pull(text) TO %I', rt);
END
$$;
