ALTER TABLE "ecommerce_products"
  ADD COLUMN IF NOT EXISTS "short_description" text,
  ADD COLUMN IF NOT EXISTS "product_type" text,
  ADD COLUMN IF NOT EXISTS "vendor" text,
  ADD COLUMN IF NOT EXISTS "compare_at_price" integer,
  ADD COLUMN IF NOT EXISTS "cost_per_item" integer,
  ADD COLUMN IF NOT EXISTS "taxable" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "tax_category" text,
  ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "visibility" text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS "published_at" timestamp,
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp,
  ADD COLUMN IF NOT EXISTS "physical_product" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "requires_shipping" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "weight" integer,
  ADD COLUMN IF NOT EXISTS "weight_unit" text NOT NULL DEFAULT 'oz',
  ADD COLUMN IF NOT EXISTS "length" integer,
  ADD COLUMN IF NOT EXISTS "width" integer,
  ADD COLUMN IF NOT EXISTS "height" integer,
  ADD COLUMN IF NOT EXISTS "dimension_unit" text NOT NULL DEFAULT 'in',
  ADD COLUMN IF NOT EXISTS "shipping_profile" text,
  ADD COLUMN IF NOT EXISTS "fulfillment_type" text NOT NULL DEFAULT 'merchant',
  ADD COLUMN IF NOT EXISTS "related_product_ids" text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "upsell_product_ids" text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS "badge_text" text;

CREATE TABLE IF NOT EXISTS "ecommerce_product_options" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" varchar NOT NULL REFERENCES "ecommerce_products"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ecommerce_product_option_values" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "option_id" varchar NOT NULL REFERENCES "ecommerce_product_options"("id") ON DELETE CASCADE,
  "value" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ecommerce_product_variants" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" varchar NOT NULL REFERENCES "ecommerce_products"("id") ON DELETE CASCADE,
  "title" text NOT NULL DEFAULT 'Default',
  "option_signature" text NOT NULL DEFAULT 'default',
  "option_values" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "sku" text,
  "barcode" text,
  "price" integer,
  "sale_price" integer,
  "compare_at_price" integer,
  "cost_per_item" integer,
  "inventory_quantity" integer NOT NULL DEFAULT 0,
  "track_inventory" boolean NOT NULL DEFAULT false,
  "low_stock_threshold" integer,
  "allow_backorder" boolean NOT NULL DEFAULT false,
  "weight" integer,
  "weight_unit" text NOT NULL DEFAULT 'oz',
  "image" text,
  "status" text NOT NULL DEFAULT 'active',
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ecommerce_product_media" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" varchar NOT NULL REFERENCES "ecommerce_products"("id") ON DELETE CASCADE,
  "variant_id" varchar REFERENCES "ecommerce_product_variants"("id") ON DELETE SET NULL,
  "media_id" varchar REFERENCES "cms_media"("id") ON DELETE SET NULL,
  "url" text NOT NULL,
  "type" text NOT NULL DEFAULT 'image',
  "alt_text" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ecommerce_product_collections" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "image" text,
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ecommerce_product_collection_assignments" (
  "product_id" varchar NOT NULL REFERENCES "ecommerce_products"("id") ON DELETE CASCADE,
  "collection_id" varchar NOT NULL REFERENCES "ecommerce_product_collections"("id") ON DELETE CASCADE
);

ALTER TABLE "ecommerce_order_items"
  ADD COLUMN IF NOT EXISTS "variant_id" varchar REFERENCES "ecommerce_product_variants"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "variant_title" text,
  ADD COLUMN IF NOT EXISTS "sku" text,
  ADD COLUMN IF NOT EXISTS "options_snapshot" jsonb;

CREATE TABLE IF NOT EXISTS "ecommerce_inventory_adjustments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" varchar NOT NULL REFERENCES "ecommerce_products"("id") ON DELETE CASCADE,
  "variant_id" varchar NOT NULL REFERENCES "ecommerce_product_variants"("id") ON DELETE CASCADE,
  "order_id" varchar REFERENCES "ecommerce_orders"("id") ON DELETE SET NULL,
  "delta" integer NOT NULL,
  "quantity_after" integer NOT NULL,
  "reason" text NOT NULL DEFAULT 'manual',
  "note" text,
  "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

INSERT INTO "ecommerce_product_variants" (
  "product_id",
  "title",
  "option_signature",
  "option_values",
  "sku",
  "price",
  "sale_price",
  "compare_at_price",
  "image",
  "status",
  "active",
  "is_default"
)
SELECT
  p."id",
  'Default',
  'default',
  '{}'::jsonb,
  p."sku",
  p."price",
  p."sale_price",
  p."compare_at_price",
  p."primary_image",
  CASE WHEN p."active" THEN 'active' ELSE 'inactive' END,
  p."active",
  true
FROM "ecommerce_products" p
WHERE NOT EXISTS (
  SELECT 1 FROM "ecommerce_product_variants" v WHERE v."product_id" = p."id"
);

UPDATE "ecommerce_order_items" oi
SET
  "variant_id" = v."id",
  "variant_title" = v."title",
  "sku" = v."sku",
  "options_snapshot" = v."option_values"
FROM "ecommerce_product_variants" v
WHERE oi."product_id" = v."product_id"
  AND v."is_default" = true
  AND oi."variant_id" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_ecommerce_products_featured" ON "ecommerce_products" ("featured");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_products_vendor" ON "ecommerce_products" ("vendor");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_product_options_product" ON "ecommerce_product_options" ("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_product_options_unique" ON "ecommerce_product_options" ("product_id", "name");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_option_values_option" ON "ecommerce_product_option_values" ("option_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_option_values_unique" ON "ecommerce_product_option_values" ("option_id", "value");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_variants_product" ON "ecommerce_product_variants" ("product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_variants_option_signature" ON "ecommerce_product_variants" ("product_id", "option_signature");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_variants_sku" ON "ecommerce_product_variants" ("sku") WHERE "sku" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_ecommerce_variants_active" ON "ecommerce_product_variants" ("active", "status");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_product_media_product" ON "ecommerce_product_media" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_product_media_variant" ON "ecommerce_product_media" ("variant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_collections_slug" ON "ecommerce_product_collections" ("slug");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_collections_active" ON "ecommerce_product_collections" ("active");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_collection_assignments_unique" ON "ecommerce_product_collection_assignments" ("product_id", "collection_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_collection_assignments_collection" ON "ecommerce_product_collection_assignments" ("collection_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_order_items_variant" ON "ecommerce_order_items" ("variant_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_inventory_adjustments_variant" ON "ecommerce_inventory_adjustments" ("variant_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_inventory_adjustments_order" ON "ecommerce_inventory_adjustments" ("order_id");
