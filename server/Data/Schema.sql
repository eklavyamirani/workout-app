-- Applied by `dotnet server.dll --migrate` (Data/Migrator.cs) as the database owner, in
-- one transaction. Roles are owned by the platform (design §5.1): this script never creates
-- or alters roles. Every statement is idempotent; production changes are expand/contract.

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

-- === Runtime role grants ===
-- With `runtime_role = true` the platform creates a separate NOSUPERUSER NOBYPASSRLS role and
-- passes its name as DATABASE_RUNTIME_ROLE; Migrator exposes it as 'workout.runtime_role'.
-- Without one, the API runs as the owner, which FORCE ROW LEVEL SECURITY still constrains.
DO $$
DECLARE
  rt text := nullif(current_setting('workout.runtime_role', true), '');
BEGIN
  IF rt IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = rt) THEN
    RAISE EXCEPTION 'runtime role "%" does not exist (it is created by the platform)', rt;
  END IF;
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', rt);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON user_data TO %I', rt);
  -- UPDATE is required by the ON CONFLICT ... DO UPDATE upsert in UserResolverMiddleware.
  EXECUTE format('GRANT SELECT, INSERT, UPDATE ON users TO %I', rt);
END
$$;
