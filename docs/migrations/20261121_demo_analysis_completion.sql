-- Apply after the WAITING_FOR_HANDLER and ANALYSIS_ACKNOWLEDGED migrations.
-- Demo zones have no known coordinates and must never be presented as real locations.
BEGIN;

ALTER TABLE zones ALTER COLUMN center_lat DROP NOT NULL;
ALTER TABLE zones ALTER COLUMN center_lng DROP NOT NULL;
ALTER TABLE zones ADD CONSTRAINT zones_center_pair_check
  CHECK ((center_lat IS NULL) = (center_lng IS NULL));

INSERT INTO zones (slug, name_th, name_en, center_lat, center_lng)
SELECT seed.slug, seed.name_th, seed.name_en, NULL, NULL
FROM (VALUES
  ('demo-zone-a', 'ย่านตัวอย่าง ก', 'Demo zone A'),
  ('demo-zone-b', 'ย่านตัวอย่าง ข', 'Demo zone B'),
  ('demo-zone-c', 'ย่านตัวอย่าง ค', 'Demo zone C')
) AS seed(slug, name_th, name_en)
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE is_active = true AND slug NOT LIKE 'demo-%')
ON CONFLICT (slug) DO NOTHING;

-- Old progress acknowledgements are obsolete once the full handler is enabled.
UPDATE notification_outbox SET status = 'FAILED', last_error = 'Superseded by completed analysis',
    updated_at = now()
WHERE notification_type = 'ANALYSIS_ACKNOWLEDGED' AND status = 'PENDING';

UPDATE analysis_jobs SET status = 'QUEUED', run_after = now(), updated_at = now()
WHERE job_type = 'ANALYSIS' AND status = 'WAITING_FOR_HANDLER';

COMMIT;
