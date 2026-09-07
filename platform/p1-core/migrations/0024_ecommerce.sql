CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "ecommerce_products" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "tagline" text,
  "description" text,
  "price" integer NOT NULL,
  "primary_image" text,
  "secondary_images" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "features" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "included" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "active" boolean NOT NULL DEFAULT true,
  "status" text NOT NULL DEFAULT 'draft',
  "sku" text,
  "tags" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "sale_price" integer,
  "discount_type" text NOT NULL DEFAULT 'NONE',
  "discount_value" integer,
  "sale_start_at" timestamp,
  "sale_end_at" timestamp,
  "meta_title" text,
  "meta_description" text,
  "meta_keywords" text,
  "url_slug" text NOT NULL,
  "canonical_url" text,
  "robots_index" boolean NOT NULL DEFAULT true,
  "robots_follow" boolean NOT NULL DEFAULT true,
  "og_title" text,
  "og_description" text,
  "og_image" text,
  "media_id" varchar REFERENCES "cms_media"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_products_url_slug" ON "ecommerce_products" ("url_slug");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_products_status_active" ON "ecommerce_products" ("status", "active");

CREATE TABLE IF NOT EXISTS "ecommerce_categories" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "parent_id" varchar,
  "image" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_categories_slug" ON "ecommerce_categories" ("slug");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_categories_active" ON "ecommerce_categories" ("active");

CREATE TABLE IF NOT EXISTS "ecommerce_product_categories" (
  "product_id" varchar NOT NULL REFERENCES "ecommerce_products"("id") ON DELETE CASCADE,
  "category_id" varchar NOT NULL REFERENCES "ecommerce_categories"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_product_categories_unique" ON "ecommerce_product_categories" ("product_id", "category_id");

CREATE TABLE IF NOT EXISTS "ecommerce_customers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "address" text,
  "line2" text,
  "city" text,
  "state" text,
  "zip_code" text,
  "country" text DEFAULT 'US',
  "avatar_url" text,
  "is_disabled" boolean NOT NULL DEFAULT false,
  "marketing_email_opt_in" boolean NOT NULL DEFAULT false,
  "order_sms_opt_in" boolean NOT NULL DEFAULT false,
  "password_hash" text,
  "session_invalidated_at" timestamp,
  "merged_into_customer_id" varchar,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_ecommerce_customers_email" ON "ecommerce_customers" ("email");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_customers_user_id" ON "ecommerce_customers" ("user_id");

CREATE TABLE IF NOT EXISTS "ecommerce_orders" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" varchar NOT NULL REFERENCES "ecommerce_customers"("id"),
  "status" text NOT NULL DEFAULT 'pending',
  "payment_status" text NOT NULL DEFAULT 'unpaid',
  "total_amount" integer NOT NULL,
  "subtotal_amount" integer NOT NULL DEFAULT 0,
  "tax_amount" integer NOT NULL DEFAULT 0,
  "shipping_amount" integer NOT NULL DEFAULT 0,
  "discount_amount" integer NOT NULL DEFAULT 0,
  "stripe_tax_calculation_id" text,
  "stripe_payment_intent_id" text,
  "stripe_session_id" text,
  "coupon_code" text,
  "is_manual_order" boolean NOT NULL DEFAULT false,
  "notes" text,
  "customer_ip" text,
  "shipping_name" text,
  "shipping_company" text,
  "shipping_address" text,
  "shipping_line2" text,
  "shipping_city" text,
  "shipping_state" text,
  "shipping_zip" text,
  "shipping_country" text DEFAULT 'US',
  "billing_same_as_shipping" boolean NOT NULL DEFAULT true,
  "billing_name" text,
  "billing_company" text,
  "billing_address" text,
  "billing_line2" text,
  "billing_city" text,
  "billing_state" text,
  "billing_zip" text,
  "billing_country" text DEFAULT 'US',
  "marketing_consent_granted" boolean NOT NULL DEFAULT false,
  "meta_fbp" text,
  "meta_fbc" text,
  "meta_event_source_url" text,
  "customer_user_agent" text,
  "lookup_token" text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_ecommerce_orders_customer_id" ON "ecommerce_orders" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_orders_status" ON "ecommerce_orders" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_orders_lookup_token" ON "ecommerce_orders" ("lookup_token");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_orders_payment_intent" ON "ecommerce_orders" ("stripe_payment_intent_id");

CREATE TABLE IF NOT EXISTS "ecommerce_order_items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" varchar NOT NULL REFERENCES "ecommerce_orders"("id") ON DELETE CASCADE,
  "product_id" varchar NOT NULL REFERENCES "ecommerce_products"("id"),
  "product_name" text NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price" integer NOT NULL,
  "line_total" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "ecommerce_coupons" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL,
  "description" text,
  "type" text NOT NULL DEFAULT 'fixed',
  "value" integer NOT NULL DEFAULT 0,
  "min_order_amount" integer,
  "max_discount_amount" integer,
  "max_redemptions" integer,
  "per_customer_limit" integer,
  "times_used" integer NOT NULL DEFAULT 0,
  "start_date" timestamp,
  "end_date" timestamp,
  "active" boolean NOT NULL DEFAULT true,
  "block_affiliate_commission" boolean NOT NULL DEFAULT false,
  "block_vip_discount" boolean NOT NULL DEFAULT false,
  "min_margin_percent" integer,
  "auto_expire_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_coupons_code" ON "ecommerce_coupons" ("code");

CREATE TABLE IF NOT EXISTS "ecommerce_coupon_redemptions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "coupon_id" varchar NOT NULL REFERENCES "ecommerce_coupons"("id"),
  "order_id" varchar NOT NULL REFERENCES "ecommerce_orders"("id"),
  "customer_id" varchar REFERENCES "ecommerce_customers"("id"),
  "discount_amount" integer NOT NULL,
  "redeemed_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ecommerce_refunds" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" varchar NOT NULL REFERENCES "ecommerce_orders"("id") ON DELETE CASCADE,
  "amount" integer NOT NULL,
  "reason" text,
  "reason_code" text,
  "type" text NOT NULL DEFAULT 'partial',
  "source" text NOT NULL DEFAULT 'manual',
  "stripe_refund_id" text,
  "status" text NOT NULL DEFAULT 'pending',
  "processed_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "processed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ecommerce_shipping_zones" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "countries" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "states" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ecommerce_shipping_rates" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "zone_id" varchar NOT NULL REFERENCES "ecommerce_shipping_zones"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "amount" integer NOT NULL DEFAULT 0,
  "min_order_amount" integer,
  "max_order_amount" integer,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ecommerce_shipments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" varchar NOT NULL REFERENCES "ecommerce_orders"("id") ON DELETE CASCADE,
  "carrier" text,
  "tracking_number" text,
  "tracking_url" text,
  "status" text NOT NULL DEFAULT 'shipped',
  "shipped_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "shipped_at" timestamp NOT NULL DEFAULT now(),
  "email_sent_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ecommerce_integration_settings" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" text NOT NULL,
  "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_integration_provider" ON "ecommerce_integration_settings" ("provider");

CREATE TABLE IF NOT EXISTS "ecommerce_processed_webhook_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" text NOT NULL DEFAULT 'stripe',
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "processed_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_webhook_events_provider_event" ON "ecommerce_processed_webhook_events" ("provider", "event_id");
