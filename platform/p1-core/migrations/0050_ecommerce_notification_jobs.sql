CREATE TABLE IF NOT EXISTS ecommerce_notification_jobs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('order_confirmation')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  order_id varchar NOT NULL REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
  deduplication_key varchar(200) NOT NULL UNIQUE,
  attempt_count integer NOT NULL DEFAULT 0,
  processing_token varchar,
  claimed_at timestamp,
  next_attempt_at timestamp NOT NULL DEFAULT now(),
  sent_at timestamp,
  failed_at timestamp,
  last_error_code varchar(120),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_notification_jobs_ready
  ON ecommerce_notification_jobs (status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS idx_ecommerce_notification_jobs_order
  ON ecommerce_notification_jobs (order_id);
