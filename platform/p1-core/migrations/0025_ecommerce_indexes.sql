CREATE INDEX IF NOT EXISTS "idx_ecommerce_product_categories_category" ON "ecommerce_product_categories" ("category_id");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_orders_payment_status" ON "ecommerce_orders" ("payment_status");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_orders_created_at" ON "ecommerce_orders" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_order_items_order" ON "ecommerce_order_items" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_order_items_product" ON "ecommerce_order_items" ("product_id");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_coupons_active" ON "ecommerce_coupons" ("active");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_coupon_redemptions_coupon" ON "ecommerce_coupon_redemptions" ("coupon_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_coupon_redemptions_order" ON "ecommerce_coupon_redemptions" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_coupon_redemptions_customer" ON "ecommerce_coupon_redemptions" ("customer_id");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_refunds_order" ON "ecommerce_refunds" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_refunds_status" ON "ecommerce_refunds" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_refunds_stripe_refund" ON "ecommerce_refunds" ("stripe_refund_id");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_shipping_zones_active" ON "ecommerce_shipping_zones" ("active");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_shipping_rates_zone" ON "ecommerce_shipping_rates" ("zone_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_shipping_rates_active" ON "ecommerce_shipping_rates" ("active");

CREATE INDEX IF NOT EXISTS "idx_ecommerce_shipments_order" ON "ecommerce_shipments" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_shipments_tracking" ON "ecommerce_shipments" ("tracking_number");
