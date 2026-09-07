ALTER TABLE "ecommerce_order_items"
  ADD COLUMN IF NOT EXISTS "product_slug" text,
  ADD COLUMN IF NOT EXISTS "image" text,
  ADD COLUMN IF NOT EXISTS "product_snapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "taxable" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "tax_category" text,
  ADD COLUMN IF NOT EXISTS "tax_amount" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "requires_shipping" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "fulfillment_type" text;
