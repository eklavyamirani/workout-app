-- === Roles ===
-- 'workout_app' is the least-privilege role the API connects as at runtime.
-- It is deliberately NOT a superuser so that row-level security is enforced.
-- This script is executed with an administrative connection (see AppDb.InitializeAsync).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'workout_app') THEN
    CREATE ROLE workout_app LOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

-- === Tables ===

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_data (
  user_id     UUID NOT NULL REFERENCES users(id),
  key         TEXT NOT NULL,
  value       JSONB NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_updated_at TIMESTAMPTZ,
  deleted     BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, key)
);

-- 'client_updated_at' records the (untrusted) client clock value; 'updated_at' is
-- always assigned server-side so incremental pull watermarks cannot skip changes.
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS client_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_data_updated ON user_data (user_id, updated_at);

-- === Row-Level Security ===
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_data' AND policyname = 'user_data_isolation'
  ) THEN
    -- current_setting(..., true) returns NULL when unset, so a request that failed to
    -- establish the user context sees no rows instead of raising an error.
    CREATE POLICY user_data_isolation ON user_data
      USING (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)
      WITH CHECK (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
  END IF;
END
$$;

-- Grant the app role access (RLS policies still apply)
GRANT USAGE ON SCHEMA public TO workout_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_data TO workout_app;
-- UPDATE is required by the ON CONFLICT ... DO UPDATE upsert in UserResolverMiddleware.
GRANT SELECT, INSERT, UPDATE ON users TO workout_app;
