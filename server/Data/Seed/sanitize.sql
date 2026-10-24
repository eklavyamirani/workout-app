-- Preview seed sanitizer (platform design §5.2: "applies a per-app sanitize script").
--
-- Applied by `dotnet server.dll --seed sanitize` as the database owner, in one transaction
-- (Data/Seeder.cs), to a seed built from a dump of real data (seed = "staging") before it is
-- frozen as `<app>_seed`. Safe and idempotent on any database; synthetic fixture users
-- (issuer urn:workout-app:fixture) are left as they are.
--
-- What it removes, and why:
--   * Identity. The platform IdP is shared by every environment, so a staging user's (iss, sub)
--     would sign them straight into "their" copied data in every preview. Each real user is
--     re-keyed to an issuer nobody can sign in with, and their email is dropped.
--   * Free text the user typed (notes, skip reasons, routine descriptions, exercise cues,
--     text custom fields, video links). Training data (sets, reps, weights, durations, dates)
--     stays: it is what makes the seed representative.
-- Program/activity names are kept (needed for a usable UI); see docs/decisions/0007.

UPDATE users
SET issuer = 'urn:workout-app:sanitized',
    subject = 'sanitized-' || id::text,
    email = NULL
WHERE issuer IS DISTINCT FROM 'urn:workout-app:fixture';

-- user_data is FORCE ROW LEVEL SECURITY, so scrub each user's rows under their own context.
DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN SELECT id FROM users WHERE issuer = 'urn:workout-app:sanitized' LOOP
    PERFORM set_config('app.current_user_id', uid::text, true);

    -- sessions:{date}:{programId} -> Session
    UPDATE user_data
    SET value = (value - 'notes' - 'practiceNext' - 'skipReason')
      || CASE WHEN jsonb_typeof(value->'activities') = 'array' THEN jsonb_build_object('activities', (
           SELECT coalesce(jsonb_agg(
               (a - 'notes')
               || CASE WHEN jsonb_typeof(a->'customValues') = 'object' THEN jsonb_build_object('customValues', (
                    SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
                    FROM jsonb_each(a->'customValues') AS cv(k, v)
                    WHERE jsonb_typeof(v) <> 'string'))
                  ELSE '{}'::jsonb END
               ORDER BY ord), '[]'::jsonb)
           FROM jsonb_array_elements(value->'activities') WITH ORDINALITY AS act(a, ord)))
         ELSE '{}'::jsonb END
    WHERE user_id = uid AND key LIKE 'sessions:%' AND jsonb_typeof(value) = 'object';

    -- activities:{programId} -> Activity[]
    UPDATE user_data
    SET value = (
      SELECT coalesce(jsonb_agg(a - 'description' ORDER BY ord), '[]'::jsonb)
      FROM jsonb_array_elements(value) WITH ORDINALITY AS act(a, ord))
    WHERE user_id = uid AND key LIKE 'activities:%' AND jsonb_typeof(value) = 'array';

    -- references:{exerciseId} -> ExerciseReference
    UPDATE user_data
    SET value = (value - 'note') || '{"youtubeLinks": []}'::jsonb
    WHERE user_id = uid AND key LIKE 'references:%' AND jsonb_typeof(value) = 'object';
  END LOOP;

  PERFORM set_config('app.current_user_id', '', true);
END
$$;

-- Self-check: fail the seed build rather than freeze a seed that still links to real people.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users
    WHERE issuer IS DISTINCT FROM 'urn:workout-app:fixture'
      AND (issuer IS DISTINCT FROM 'urn:workout-app:sanitized' OR email IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'sanitize: users with a real identity remain';
  END IF;
END
$$;
