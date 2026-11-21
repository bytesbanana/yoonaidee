-- Apply once after 20261121_analysis_waiting_for_handler.sql on existing databases.
BEGIN;

DO $$
DECLARE old_constraint text;
BEGIN
  SELECT conname INTO old_constraint
  FROM pg_constraint
  WHERE conrelid = 'notification_outbox'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%notification_type%'
    AND pg_get_constraintdef(oid) LIKE '%CONVERSATION_MESSAGE%'
  ORDER BY oid
  LIMIT 1;
  IF old_constraint IS NULL THEN
    RAISE EXCEPTION 'notification_outbox notification_type CHECK constraint not found';
  END IF;
  EXECUTE format('ALTER TABLE notification_outbox DROP CONSTRAINT %I', old_constraint);
END $$;

ALTER TABLE notification_outbox
  ADD CONSTRAINT notification_outbox_notification_type_check
  CHECK (notification_type IN ('CONVERSATION_MESSAGE','ANALYSIS_ACKNOWLEDGED',
                               'ANALYSIS_COMPLETED','ANALYSIS_FAILED'));

COMMIT;
