CREATE TABLE IF NOT EXISTS ecommerce_fulfillment_locations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  type text NOT NULL DEFAULT 'merchant',
  phone text,
  email text,
  address text,
  line2 text,
  city text,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'US',
  timezone text NOT NULL DEFAULT 'America/New_York',
  is_primary boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ecommerce_fulfillment_locations_code
  ON ecommerce_fulfillment_locations (code);
CREATE INDEX IF NOT EXISTS idx_ecommerce_fulfillment_locations_active
  ON ecommerce_fulfillment_locations (active);
CREATE INDEX IF NOT EXISTS idx_ecommerce_fulfillment_locations_type
  ON ecommerce_fulfillment_locations (type);

CREATE TABLE IF NOT EXISTS ecommerce_shipping_providers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  display_name text NOT NULL,
  type text NOT NULL DEFAULT 'aggregator',
  capabilities text[] NOT NULL DEFAULT ARRAY[]::text[],
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  test_mode boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT false,
  connected_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ecommerce_shipping_providers_provider
  ON ecommerce_shipping_providers (provider);
CREATE INDEX IF NOT EXISTS idx_ecommerce_shipping_providers_active
  ON ecommerce_shipping_providers (active);
CREATE INDEX IF NOT EXISTS idx_ecommerce_shipping_providers_type
  ON ecommerce_shipping_providers (type);

CREATE TABLE IF NOT EXISTS ecommerce_fulfillments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar NOT NULL REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
  location_id varchar REFERENCES ecommerce_fulfillment_locations(id) ON DELETE SET NULL,
  provider_id varchar REFERENCES ecommerce_shipping_providers(id) ON DELETE SET NULL,
  shipment_id varchar REFERENCES ecommerce_shipments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  method text,
  service_level text,
  carrier text,
  tracking_number text,
  tracking_url text,
  label_url text,
  label_cost integer,
  estimated_delivery_at timestamp,
  fulfilled_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fulfillments_order
  ON ecommerce_fulfillments (order_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_fulfillments_location
  ON ecommerce_fulfillments (location_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_fulfillments_provider
  ON ecommerce_fulfillments (provider_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_fulfillments_status
  ON ecommerce_fulfillments (status);
CREATE INDEX IF NOT EXISTS idx_ecommerce_fulfillments_tracking
  ON ecommerce_fulfillments (tracking_number);

CREATE TABLE IF NOT EXISTS ecommerce_fulfillment_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id varchar NOT NULL REFERENCES ecommerce_fulfillments(id) ON DELETE CASCADE,
  order_item_id varchar NOT NULL REFERENCES ecommerce_order_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_fulfillment_items_fulfillment
  ON ecommerce_fulfillment_items (fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_fulfillment_items_order_item
  ON ecommerce_fulfillment_items (order_item_id);
