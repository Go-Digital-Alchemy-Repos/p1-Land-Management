ALTER TABLE ecommerce_notification_jobs
  ADD COLUMN IF NOT EXISTS manual_retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_manual_retry_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_manual_retry_by varchar REFERENCES users(id) ON DELETE SET NULL;
