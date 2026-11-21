-- Apply once to an existing database before starting the Java ANALYSIS consumer.
BEGIN;

DO $$
DECLARE old_constraint text;
BEGIN
  SELECT conname INTO old_constraint
  FROM pg_constraint
  WHERE conrelid = 'analysis_jobs'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%'
    AND pg_get_constraintdef(oid) LIKE '%QUEUED%'
  ORDER BY oid
  LIMIT 1;
  IF old_constraint IS NULL THEN
    RAISE EXCEPTION 'analysis_jobs status CHECK constraint not found';
  END IF;
  EXECUTE format('ALTER TABLE analysis_jobs DROP CONSTRAINT %I', old_constraint);
END $$;

ALTER TABLE analysis_jobs
  ADD CONSTRAINT analysis_jobs_status_check
  CHECK (status IN ('QUEUED','PROCESSING','COLLECTING','SCORING','EXPLAINING',
                   'NEEDS_INPUT','WAITING_FOR_HANDLER','COMPLETED','FAILED'));

COMMIT;
