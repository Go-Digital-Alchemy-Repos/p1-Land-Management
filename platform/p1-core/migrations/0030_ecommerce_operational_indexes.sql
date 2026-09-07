CREATE INDEX IF NOT EXISTS "idx_ecommerce_categories_parent_sort"
  ON "ecommerce_categories" ("parent_id", "sort_order");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_products_storefront"
  ON "ecommerce_products" ("visibility", "status", "active", "published_at");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_products_published_at"
  ON "ecommerce_products" ("published_at");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_orders_status_created"
  ON "ecommerce_orders" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_orders_payment_created"
  ON "ecommerce_orders" ("payment_status", "created_at");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_shipping_rates_zone_active_amount"
  ON "ecommerce_shipping_rates" ("zone_id", "active", "amount");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_inventory_adjustments_order_variant_reason"
  ON "ecommerce_inventory_adjustments" ("order_id", "variant_id", "reason");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_webhook_events_processed_at"
  ON "ecommerce_processed_webhook_events" ("processed_at");
