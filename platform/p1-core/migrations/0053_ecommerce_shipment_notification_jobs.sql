ALTER TABLE ecommerce_notification_jobs
  ADD COLUMN IF NOT EXISTS shipment_id varchar REFERENCES ecommerce_shipments(id) ON DELETE CASCADE;

ALTER TABLE ecommerce_notification_jobs
  DROP CONSTRAINT IF EXISTS ecommerce_notification_jobs_type_check;
ALTER TABLE ecommerce_notification_jobs
  ADD CONSTRAINT ecommerce_notification_jobs_type_check
  CHECK (type IN ('order_confirmation', 'refund_confirmation', 'shipment_confirmation'));

CREATE INDEX IF NOT EXISTS idx_ecommerce_notification_jobs_shipment
  ON ecommerce_notification_jobs (shipment_id);
