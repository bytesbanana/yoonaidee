-- Yoo Nai Dee | Hackathon MVP | PostgreSQL initialization
-- Target: PostgreSQL 15+ / Railway PostgreSQL
-- Run ONCE on a NEW database. This is not an incremental migration.
-- Does not require PostGIS, Redis, pgvector, or external extensions.
-- Timestamps are UTC-capable TIMESTAMPTZ; app renders in Asia/Bangkok.
BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id text NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  state text NOT NULL DEFAULT 'COLLECTING'
    CHECK (state IN ('COLLECTING','WAITING_FOR_USER','READY','ANALYZING','COMPLETED','CLOSED')),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(preferences) = 'object'),
  profile_schema_version integer NOT NULL DEFAULT 1 CHECK (profile_schema_version > 0),
  profile_version integer NOT NULL DEFAULT 0 CHECK (profile_version >= 0),
  profile_source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(profile_source_metadata) = 'object'),
  ready_for_analysis boolean NOT NULL DEFAULT false,
  awaiting_question text,
  next_message_sequence bigint NOT NULL DEFAULT 1 CHECK (next_message_sequence > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CHECK ((state <> 'CLOSED') OR closed_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_sessions_user_created ON conversation_sessions(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_one_open_per_user
  ON conversation_sessions(user_id) WHERE closed_at IS NULL;

CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES conversation_sessions(id),
  sequence_no bigint NOT NULL CHECK (sequence_no > 0),
  direction text NOT NULL CHECK (direction IN ('IN','OUT')),
  line_message_id text UNIQUE,
  webhook_event_id text UNIQUE,
  content text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  delivery_status text CHECK (delivery_status IN ('PENDING','SENT','FAILED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_order UNIQUE (session_id, sequence_no)
);
CREATE INDEX IF NOT EXISTS ix_messages_session_sequence
  ON conversation_messages(session_id, sequence_no);

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES conversation_sessions(id),
  message_id uuid REFERENCES conversation_messages(id),
  job_type text NOT NULL CHECK (job_type IN ('CONVERSATION','ANALYSIS')),
  status text NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED','PROCESSING','COLLECTING','SCORING','EXPLAINING','NEEDS_INPUT','COMPLETED','FAILED')),
  idempotency_key text NOT NULL UNIQUE,
  profile_version integer CHECK (profile_version IS NULL OR profile_version >= 0),
  input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(input_snapshot) = 'object'),
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  progress_detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(progress_detail) = 'object'),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
  run_after timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (attempts <= max_attempts)
);
CREATE INDEX IF NOT EXISTS ix_jobs_ready
  ON analysis_jobs(run_after, created_at)
  WHERE status IN ('QUEUED','FAILED');
CREATE INDEX IF NOT EXISTS ix_jobs_expired_leases
  ON analysis_jobs(lease_until)
  WHERE status IN ('PROCESSING','COLLECTING','SCORING','EXPLAINING');
CREATE INDEX IF NOT EXISTS ix_jobs_session_created
  ON analysis_jobs(session_id, created_at DESC);
-- Jobs with NEEDS_INPUT are parked. They are not automatically claimed.

CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_th text NOT NULL,
  name_en text,
  center_lat numeric(10,7) CHECK (center_lat BETWEEN -90 AND 90),
  center_lng numeric(10,7) CHECK (center_lng BETWEEN -180 AND 180),
  boundary jsonb, -- optional GeoJSON; validate GeoJSON coordinates/shape in application
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (boundary IS NULL OR jsonb_typeof(boundary) = 'object'),
  CHECK ((center_lat IS NULL) = (center_lng IS NULL))
);

CREATE TABLE IF NOT EXISTS zone_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL UNIQUE REFERENCES zones(id) ON DELETE CASCADE,
  features jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(features) = 'object'),
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(source_metadata) = 'object'),
  confidence numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),
  computed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_zone_features_expiry ON zone_features(expires_at);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  rent_price numeric(12,2) CHECK (rent_price >= 0),
  currency char(3) NOT NULL DEFAULT 'THB',
  lat numeric(10,7) CHECK (lat BETWEEN -90 AND 90),
  lng numeric(10,7) CHECK (lng BETWEEN -180 AND 180),
  listing_url text,
  image_urls jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(image_urls) = 'array'),
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(raw_data) = 'object'),
  source_updated_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT uq_provider_listing UNIQUE (source, external_id)
);
CREATE INDEX IF NOT EXISTS ix_properties_zone_price ON properties(zone_id, rent_price);
CREATE INDEX IF NOT EXISTS ix_properties_expiry ON properties(expires_at);

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key text PRIMARY KEY, -- app-computed hash of provider + normalized request + version
  provider text NOT NULL,
  response_data jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_api_cache_expiry ON api_cache(expires_at);

CREATE TABLE IF NOT EXISTS analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES analysis_jobs(id),
  profile_snapshot jsonb NOT NULL CHECK (jsonb_typeof(profile_snapshot) = 'object'),
  result_schema_version integer NOT NULL DEFAULT 1 CHECK (result_schema_version > 0),
  scoring_version text NOT NULL DEFAULT 'v1',
  result_data jsonb NOT NULL CHECK (jsonb_typeof(result_data) = 'object'),
  line_preview jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(line_preview) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Transactional outbox covers LINE conversation follow-ups AND analysis completion.
-- Do not hold a DB transaction open while calling LINE's network API.
CREATE TABLE IF NOT EXISTS notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  session_id uuid NOT NULL REFERENCES conversation_sessions(id),
  analysis_result_id uuid REFERENCES analysis_results(id),
  idempotency_key text NOT NULL UNIQUE,
  notification_type text NOT NULL
    CHECK (notification_type IN ('CONVERSATION_MESSAGE','ANALYSIS_COMPLETED','ANALYSIS_FAILED')),
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PROCESSING','SENT','FAILED')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  locked_by text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (attempts <= max_attempts),
  CHECK (notification_type <> 'ANALYSIS_COMPLETED' OR analysis_result_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_notifications_ready
  ON notification_outbox(next_attempt_at, created_at)
  WHERE status IN ('PENDING','FAILED');
CREATE INDEX IF NOT EXISTS ix_notifications_lease
  ON notification_outbox(lease_until) WHERE status = 'PROCESSING';
CREATE INDEX IF NOT EXISTS ix_notifications_session_created
  ON notification_outbox(session_id, created_at DESC);

COMMIT;

-- Worker implementation notes (NOT additional schema):
-- 1) Claim one eligible QUEUED / retryable FAILED / expired-lease job inside a transaction:
--    SELECT id FROM analysis_jobs WHERE ... FOR UPDATE SKIP LOCKED LIMIT 1;
--    UPDATE job SET attempts = attempts + 1, status = 'PROCESSING',
--       locked_by = :worker_id, lease_until = now() + interval '2 minutes'.
--    Ensure attempts < max_attempts, run_after <= now() for queued/retries.
-- 2) Renew lease while working; on transient failure set FAILED + future run_after;
--    at max_attempts FAILED remains terminal. Verify lock ownership before finish.
-- 3) Serialize CONVERSATION jobs per session (row lock / advisory lock) and
--    increment next_message_sequence under session row lock to preserve ordering.
-- 4) Insert analysis_results + mark analysis_jobs COMPLETED + insert
--    notification_outbox PENDING in ONE transaction, then commit BEFORE LINE Push.
-- 5) Notification retries are at-least-once; an ambiguous network timeout may
--    cause duplicate LINE messages. Use provider retry/idempotency support if available.
-- 6) Authorization: never query result by id alone. Join analysis_results ->
--    analysis_jobs -> conversation_sessions -> users and require authenticated
--    line_user_id to match. LIFF must not connect directly to PostgreSQL.
