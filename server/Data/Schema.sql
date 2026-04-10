-- === Roles ===
-- 'workout_app' is the role the API connects as (has RLS enforced)
-- Run as superuser/owner to set up:

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'workout_app') THEN
    CREATE ROLE workout_app LOGIN PASSWORD 'workout_app_password';
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
  deleted     BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_data_updated ON user_data (user_id, updated_at);

-- === Row-Level Security ===
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_data' AND policyname = 'user_data_isolation'
  ) THEN
    CREATE POLICY user_data_isolation ON user_data
      USING (user_id = current_setting('app.current_user_id')::uuid)
      WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
  END IF;
END
$$;

-- Grant the app role access (RLS policies still apply)
GRANT SELECT, INSERT, UPDATE, DELETE ON user_data TO workout_app;
GRANT SELECT, INSERT ON users TO workout_app;
