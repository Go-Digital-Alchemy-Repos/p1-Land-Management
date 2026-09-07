ALTER TABLE woo_import_runs
  ADD COLUMN IF NOT EXISTS disposition_fingerprint text,
  ADD COLUMN IF NOT EXISTS disposition_approval_reference text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'woo_import_runs_disposition_evidence_pair'
      AND conrelid = 'woo_import_runs'::regclass
  ) THEN
    ALTER TABLE woo_import_runs
      ADD CONSTRAINT woo_import_runs_disposition_evidence_pair
      CHECK (
        (disposition_fingerprint IS NULL AND disposition_approval_reference IS NULL)
        OR (
          disposition_fingerprint ~ '^[a-f0-9]{64}$'
          AND length(disposition_approval_reference) BETWEEN 1 AND 200
        )
      );
  END IF;
END $$;
