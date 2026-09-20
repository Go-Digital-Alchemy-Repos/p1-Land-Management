-- Preserve existing started/completed receipts; new reviews reserve before execution.
ALTER TABLE p1_operations.restore_receipts DROP CONSTRAINT restore_receipts_status_check;
ALTER TABLE p1_operations.restore_receipts ADD CONSTRAINT restore_receipts_status_check CHECK (status IN ('reserved','started','completed','not_applied'));
ALTER TABLE p1_operations.restore_receipts ALTER COLUMN status SET DEFAULT 'reserved';
ALTER TABLE p1_operations.restore_receipts ALTER COLUMN started_at DROP NOT NULL;
ALTER TABLE p1_operations.restore_receipts ALTER COLUMN started_at DROP DEFAULT;
ALTER TABLE p1_operations.restore_receipts ADD CONSTRAINT restore_receipts_started_check CHECK ((status <> 'reserved' OR started_at IS NULL) AND (status NOT IN ('started','completed') OR started_at IS NOT NULL));
