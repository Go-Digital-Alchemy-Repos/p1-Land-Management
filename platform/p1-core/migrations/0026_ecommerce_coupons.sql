ALTER TABLE "ecommerce_orders"
  ADD COLUMN IF NOT EXISTS "coupon_snapshot" jsonb;

ALTER TABLE "ecommerce_coupons"
  ADD COLUMN IF NOT EXISTS "name" text,
  ADD COLUMN IF NOT EXISTS "notes" text,
  ADD COLUMN IF NOT EXISTS "customer_eligibility" text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS "eligible_customer_emails" text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "eligible_product_ids" text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "eligible_category_ids" text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "excluded_product_ids" text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "excluded_category_ids" text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "allow_stacking" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "applies_to" text NOT NULL DEFAULT 'subtotal',
  ADD COLUMN IF NOT EXISTS "apply_before_tax" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp,
  ADD COLUMN IF NOT EXISTS "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "updated_by" varchar REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "ecommerce_coupon_redemptions"
  ADD COLUMN IF NOT EXISTS "coupon_code" text,
  ADD COLUMN IF NOT EXISTS "customer_email" text;

CREATE INDEX IF NOT EXISTS "idx_ecommerce_coupons_archived" ON "ecommerce_coupons" ("archived_at");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_coupons_dates" ON "ecommerce_coupons" ("start_date", "end_date");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_coupon_redemptions_email" ON "ecommerce_coupon_redemptions" ("customer_email");
