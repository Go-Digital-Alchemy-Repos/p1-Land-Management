CREATE TABLE IF NOT EXISTS ecommerce_inventory_reservations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar NOT NULL REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
  variant_id varchar NOT NULL REFERENCES ecommerce_product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  expires_at timestamp NOT NULL,
  released_at timestamp,
  release_reason varchar(40),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (order_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_inventory_reservations_variant_expiry
  ON ecommerce_inventory_reservations (variant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_ecommerce_inventory_reservations_order
  ON ecommerce_inventory_reservations (order_id);
