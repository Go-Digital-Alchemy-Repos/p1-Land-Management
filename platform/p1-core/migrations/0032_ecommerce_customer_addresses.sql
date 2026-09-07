CREATE TABLE IF NOT EXISTS ecommerce_customer_addresses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id varchar NOT NULL REFERENCES ecommerce_customers(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  name text,
  company text,
  phone text,
  address text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  is_default boolean NOT NULL DEFAULT false,
  archived_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_customer_addresses_customer
  ON ecommerce_customer_addresses(customer_id);

CREATE INDEX IF NOT EXISTS idx_ecommerce_customer_addresses_default
  ON ecommerce_customer_addresses(customer_id, is_default);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ecommerce_customer_addresses_one_default
  ON ecommerce_customer_addresses(customer_id)
  WHERE is_default = true AND archived_at IS NULL;
