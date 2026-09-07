-- Replay the current notification schema without temporarily narrowing valid job types.
-- Historical 0052/0053 constraints cannot be replayed after newer jobs have been created.
ALTER TABLE ecommerce_notification_jobs
  ADD COLUMN IF NOT EXISTS refund_id varchar REFERENCES ecommerce_refunds(id) ON DELETE CASCADE;



DO $$
DECLARE
  migration_column_name text;
BEGIN
  FOREACH migration_column_name IN ARRAY ARRAY['claimed_at', 'next_attempt_at', 'sent_at', 'failed_at']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns AS column_definition
      WHERE column_definition.table_schema = 'public'
        AND column_definition.table_name = 'ecommerce_notification_jobs'
        AND column_definition.column_name = migration_column_name
        AND column_definition.data_type = 'timestamp without time zone'
    ) THEN
      EXECUTE format(
        'ALTER TABLE ecommerce_notification_jobs ALTER COLUMN %1$I TYPE timestamp with time zone USING %1$I AT TIME ZONE ''UTC''',
        migration_column_name
      );
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_ecommerce_notification_jobs_refund
  ON ecommerce_notification_jobs (refund_id);

ALTER TABLE ecommerce_notification_jobs
  ADD COLUMN IF NOT EXISTS shipment_id varchar REFERENCES ecommerce_shipments(id) ON DELETE CASCADE;



CREATE INDEX IF NOT EXISTS idx_ecommerce_notification_jobs_shipment
  ON ecommerce_notification_jobs (shipment_id);

ALTER TABLE ecommerce_notification_jobs
  ADD COLUMN IF NOT EXISTS status_value text;

ALTER TABLE ecommerce_notification_jobs
  DROP CONSTRAINT IF EXISTS ecommerce_notification_jobs_type_check;
ALTER TABLE ecommerce_notification_jobs
  ADD CONSTRAINT ecommerce_notification_jobs_type_check
  CHECK (type IN ('order_confirmation', 'refund_confirmation', 'shipment_confirmation', 'order_status'));
