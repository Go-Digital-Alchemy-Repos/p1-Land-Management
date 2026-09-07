CREATE TABLE IF NOT EXISTS cms_form_effect_jobs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id varchar NOT NULL REFERENCES cms_form_submissions(id) ON DELETE CASCADE,
  deduplication_key text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'skipped', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0,
  processing_token varchar,
  claimed_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failed_at timestamptz,
  last_error_code varchar(120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_form_effect_jobs_deduplication
  ON cms_form_effect_jobs (submission_id, deduplication_key);
CREATE INDEX IF NOT EXISTS idx_cms_form_effect_jobs_ready
  ON cms_form_effect_jobs (status, next_attempt_at, created_at);
