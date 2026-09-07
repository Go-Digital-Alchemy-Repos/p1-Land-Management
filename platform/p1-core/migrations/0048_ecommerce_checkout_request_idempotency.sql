CREATE TABLE IF NOT EXISTS ecommerce_checkout_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  request_key varchar(128) NOT NULL UNIQUE,
  customer_email text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  order_id varchar REFERENCES ecommerce_orders(id) ON DELETE SET NULL,
  failure_code text,
  completed_at timestamp,
  failed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_checkout_requests_status_created
  ON ecommerce_checkout_requests (status, created_at);
