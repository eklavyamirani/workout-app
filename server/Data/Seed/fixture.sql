-- Preview seed fixture (platform.toml [previews] seed = "fixture"; platform design §5.2).
--
-- Applied by `dotnet server.dll --seed fixture` as the database owner, after migrations, in
-- one transaction (Data/Seeder.cs). The platform freezes the result as `<app>_seed`; preview
-- databases are copy-on-write clones of it.
--
-- Two synthetic users with realistic data in the shapes the SPA syncs (src/types/index.ts,
-- src/storage/adapter.ts key patterns). Their issuer is not a real IdP, so nobody can sign in as
-- them: they exist so migrations and queries run against representative rows, and previews
-- start with non-empty tables. Idempotent: re-running changes nothing.

INSERT INTO users (id, issuer, subject, email) VALUES
  ('00000000-0000-4000-8000-00000000f001', 'urn:workout-app:fixture', 'gzclp-lifter', NULL),
  ('00000000-0000-4000-8000-00000000f002', 'urn:workout-app:fixture', 'ballet-dancer', NULL)
ON CONFLICT DO NOTHING;

-- user_data is FORCE ROW LEVEL SECURITY: rows are written under each user's context.

-- === gzclp-lifter ===
SELECT set_config('app.current_user_id', '00000000-0000-4000-8000-00000000f001', true);

INSERT INTO user_data (user_id, key, value, client_updated_at) VALUES
('00000000-0000-4000-8000-00000000f001', 'programs:list',
 '["fixture-gzclp"]', '2026-10-01T08:00:00Z'),

('00000000-0000-4000-8000-00000000f001', 'programs:fixture-gzclp',
 '{"id":"fixture-gzclp","name":"GZCLP","type":"gzclp","schedule":{"mode":"weekly","daysOfWeek":[1,3,5]},
   "isActive":true,"createdAt":"2026-10-01T08:00:00.000Z","currentWeek":3,"lastWorkoutDay":2}',
 '2026-10-01T08:00:00Z'),

('00000000-0000-4000-8000-00000000f001', 'activities:fixture-gzclp',
 '[{"id":"squat","name":"Squat","programId":"fixture-gzclp","trackingType":"sets-reps-weight","tier":"T1","muscleGroups":["Quads","Glutes"],"equipment":"Barbell","startingWeight":135},
   {"id":"bench","name":"Bench Press","programId":"fixture-gzclp","trackingType":"sets-reps-weight","tier":"T1","muscleGroups":["Chest","Triceps"],"equipment":"Barbell","startingWeight":115},
   {"id":"rdl","name":"Romanian Deadlift","programId":"fixture-gzclp","trackingType":"sets-reps-weight","tier":"T2","muscleGroups":["Hamstrings","Back"],"equipment":"Barbell","startingWeight":95},
   {"id":"incline_bench","name":"Incline Bench Press","programId":"fixture-gzclp","trackingType":"sets-reps-weight","tier":"T2","muscleGroups":["Chest","Shoulders"],"equipment":"Barbell","startingWeight":75},
   {"id":"lat_pulldown","name":"Lat Pulldown","programId":"fixture-gzclp","trackingType":"sets-reps-weight","tier":"T3","muscleGroups":["Back","Biceps"],"equipment":"Cable","startingWeight":70}]',
 '2026-10-01T08:00:00Z'),

('00000000-0000-4000-8000-00000000f001', 'gzclp:fixture-gzclp:days',
 '[{"dayNumber":1,"name":"Day 1 - Squat Focus","t1ExerciseId":"squat","t2ExerciseId":"incline_bench","t3ExerciseIds":["lat_pulldown"]},
   {"dayNumber":2,"name":"Day 2 - Bench Focus","t1ExerciseId":"bench","t2ExerciseId":"rdl","t3ExerciseIds":["lat_pulldown"]}]',
 '2026-10-01T08:00:00Z'),

('00000000-0000-4000-8000-00000000f001', 'sessions:2026-10-19:fixture-gzclp',
 '{"id":"fixture-session-1","programId":"fixture-gzclp","date":"2026-10-19","status":"completed",
   "startTime":"2026-10-19T17:30:00.000Z","endTime":"2026-10-19T18:25:00.000Z","duration":55,
   "activities":[
     {"activityId":"squat","trackingType":"sets-reps-weight","sets":[
       {"id":"s1","setNumber":1,"weight":155,"reps":3,"isWarmup":false,"timestamp":"2026-10-19T17:40:00.000Z"},
       {"id":"s2","setNumber":2,"weight":155,"reps":3,"isWarmup":false,"timestamp":"2026-10-19T17:44:00.000Z"},
       {"id":"s3","setNumber":3,"weight":155,"reps":3,"isWarmup":false,"timestamp":"2026-10-19T17:48:00.000Z"},
       {"id":"s4","setNumber":4,"weight":155,"reps":3,"isWarmup":false,"timestamp":"2026-10-19T17:52:00.000Z"},
       {"id":"s5","setNumber":5,"weight":155,"reps":6,"isWarmup":false,"isAmrap":true,"rpe":9,"timestamp":"2026-10-19T17:56:00.000Z"}]},
     {"activityId":"incline_bench","trackingType":"sets-reps-weight","sets":[
       {"id":"s6","setNumber":1,"weight":85,"reps":10,"isWarmup":false,"timestamp":"2026-10-19T18:05:00.000Z"},
       {"id":"s7","setNumber":2,"weight":85,"reps":10,"isWarmup":false,"timestamp":"2026-10-19T18:09:00.000Z"},
       {"id":"s8","setNumber":3,"weight":85,"reps":12,"isWarmup":false,"isAmrap":true,"timestamp":"2026-10-19T18:13:00.000Z"}]},
     {"activityId":"lat_pulldown","trackingType":"sets-reps-weight","sets":[
       {"id":"s9","setNumber":1,"weight":80,"reps":15,"isWarmup":false,"timestamp":"2026-10-19T18:18:00.000Z"},
       {"id":"s10","setNumber":2,"weight":80,"reps":15,"isWarmup":false,"timestamp":"2026-10-19T18:20:00.000Z"},
       {"id":"s11","setNumber":3,"weight":80,"reps":27,"isWarmup":false,"isAmrap":true,"timestamp":"2026-10-19T18:23:00.000Z"}]}],
   "notes":"Fixture note: depth felt good."}',
 '2026-10-19T18:25:00Z'),

('00000000-0000-4000-8000-00000000f001', 'sessions:2026-10-21:fixture-gzclp',
 '{"id":"fixture-session-2","programId":"fixture-gzclp","date":"2026-10-21","status":"skipped","activities":[],
   "skipReason":"Fixture skip reason."}',
 '2026-10-21T07:00:00Z'),

('00000000-0000-4000-8000-00000000f001', 'references:squat',
 '{"exerciseId":"squat","youtubeLinks":[],"note":"Fixture cue: brace before descent.","updatedAt":"2026-10-02T09:00:00.000Z"}',
 '2026-10-02T09:00:00Z')
ON CONFLICT (user_id, key) DO NOTHING;

-- === ballet-dancer ===
SELECT set_config('app.current_user_id', '00000000-0000-4000-8000-00000000f002', true);

INSERT INTO user_data (user_id, key, value, client_updated_at) VALUES
('00000000-0000-4000-8000-00000000f002', 'programs:list',
 '["fixture-ballet"]', '2026-10-05T08:00:00Z'),

('00000000-0000-4000-8000-00000000f002', 'programs:fixture-ballet',
 '{"id":"fixture-ballet","name":"Ballet basics","type":"ballet","schedule":{"mode":"weekly","daysOfWeek":[2,4]},
   "isActive":true,"createdAt":"2026-10-05T08:00:00.000Z"}',
 '2026-10-05T08:00:00Z'),

('00000000-0000-4000-8000-00000000f002', 'activities:fixture-ballet',
 '[{"id":"fixture-barre","name":"Barre","programId":"fixture-ballet","trackingType":"duration","targetDuration":30,"section":"barre",
    "description":"Fixture routine description.","movements":[{"id":"plies","name":"Pliés"},{"id":"tendus","name":"Tendus"},{"id":"grand_battement","name":"Grand battement"}]},
   {"id":"fixture-center","name":"Center","programId":"fixture-ballet","trackingType":"duration","targetDuration":20,"section":"center",
    "movements":[{"id":"adagio_center","name":"Adagio"},{"id":"chaines","name":"Chaînés"}]}]',
 '2026-10-05T08:00:00Z'),

('00000000-0000-4000-8000-00000000f002', 'sessions:2026-10-20:fixture-ballet',
 '{"id":"fixture-session-3","programId":"fixture-ballet","date":"2026-10-20","status":"completed",
   "startTime":"2026-10-20T19:00:00.000Z","endTime":"2026-10-20T19:50:00.000Z","duration":50,
   "activities":[
     {"activityId":"fixture-barre","trackingType":"duration","duration":30,"notes":"Fixture combination notes."},
     {"activityId":"fixture-center","trackingType":"duration","duration":20,"customValues":{"turns":3,"felt":"Fixture free text"}}],
   "notes":"Fixture session notes.","practiceNext":"Fixture practice-next text."}',
 '2026-10-20T19:50:00Z')
ON CONFLICT (user_id, key) DO NOTHING;
