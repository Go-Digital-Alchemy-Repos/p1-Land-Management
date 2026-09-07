ALTER TABLE ecommerce_notification_jobs
  ADD COLUMN IF NOT EXISTS status_value text;

ALTER TABLE ecommerce_notification_jobs
  DROP CONSTRAINT IF EXISTS ecommerce_notification_jobs_type_check;
ALTER TABLE ecommerce_notification_jobs
  ADD CONSTRAINT ecommerce_notification_jobs_type_check
  CHECK (type IN ('order_confirmation', 'refund_confirmation', 'shipment_confirmation', 'order_status'));
