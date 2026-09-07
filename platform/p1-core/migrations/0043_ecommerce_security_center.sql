ALTER TABLE ecommerce_orders
  ADD COLUMN IF NOT EXISTS fraud_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fraud_risk_level text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS fraud_decision text NOT NULL DEFAULT 'allow',
  ADD COLUMN IF NOT EXISTS fraud_review_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS fraud_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_risk_level text,
  ADD COLUMN IF NOT EXISTS stripe_risk_score integer,
  ADD COLUMN IF NOT EXISTS stripe_outcome_type text,
  ADD COLUMN IF NOT EXISTS stripe_outcome_reason text,
  ADD COLUMN IF NOT EXISTS stripe_cvc_check text,
  ADD COLUMN IF NOT EXISTS stripe_address_line1_check text,
  ADD COLUMN IF NOT EXISTS stripe_address_postal_code_check text;

CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_fraud_review
  ON ecommerce_orders (fraud_review_status, created_at);

CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_fraud_level
  ON ecommerce_orders (fraud_risk_level, created_at);

CREATE TABLE IF NOT EXISTS ecommerce_fraud_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar REFERENCES ecommerce_orders(id) ON DELETE SET NULL,
  customer_id varchar REFERENCES ecommerce_customers(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  decision text NOT NULL,
  risk_level text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  email text,
  ip_address text,
  user_agent text,
  amount integer,
  currency text NOT NULL DEFAULT 'usd',
  matched_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  request_snapshot jsonb DEFAULT '{}'::jsonb,
  message text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fraud_events_order
  ON ecommerce_fraud_events (order_id);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fraud_events_customer
  ON ecommerce_fraud_events (customer_id);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fraud_events_created
  ON ecommerce_fraud_events (created_at);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fraud_events_decision
  ON ecommerce_fraud_events (decision, created_at);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fraud_events_ip
  ON ecommerce_fraud_events (ip_address, created_at);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fraud_events_email
  ON ecommerce_fraud_events (email, created_at);

CREATE TABLE IF NOT EXISTS ecommerce_fraud_blocks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  value text NOT NULL,
  reason text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamp,
  created_by varchar REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fraud_blocks_lookup
  ON ecommerce_fraud_blocks (type, value, active);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fraud_blocks_expires
  ON ecommerce_fraud_blocks (expires_at);
