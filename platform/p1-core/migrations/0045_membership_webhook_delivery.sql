ALTER TABLE membership_processed_webhook_events
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS attempt_count integer,
  ADD COLUMN IF NOT EXISTS processing_token varchar,
  ADD COLUMN IF NOT EXISTS started_at timestamp,
  ADD COLUMN IF NOT EXISTS completed_at timestamp,
  ADD COLUMN IF NOT EXISTS last_error text;

UPDATE membership_processed_webhook_events
SET
  status = 'processed',
  attempt_count = COALESCE(attempt_count, 1),
  started_at = COALESCE(started_at, processed_at, now()),
  completed_at = COALESCE(completed_at, processed_at, now())
WHERE status IS NULL;

UPDATE membership_processed_webhook_events
SET
  attempt_count = COALESCE(attempt_count, 1),
  started_at = COALESCE(started_at, now())
WHERE attempt_count IS NULL OR started_at IS NULL;

ALTER TABLE membership_processed_webhook_events
  ALTER COLUMN status SET DEFAULT 'processing',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN attempt_count SET DEFAULT 1,
  ALTER COLUMN attempt_count SET NOT NULL,
  ALTER COLUMN started_at SET DEFAULT now(),
  ALTER COLUMN started_at SET NOT NULL,
  ALTER COLUMN processed_at DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_membership_webhook_status_started
  ON membership_processed_webhook_events (status, started_at);
