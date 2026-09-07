ALTER TABLE cms_form_submissions
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(128);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_form_submissions_form_idempotency_key
  ON cms_form_submissions (form_id, idempotency_key);
