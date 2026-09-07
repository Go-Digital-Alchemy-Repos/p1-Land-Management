CREATE TABLE IF NOT EXISTS "ecommerce_order_notes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" varchar NOT NULL REFERENCES "ecommerce_orders"("id") ON DELETE cascade,
  "author_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "body" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ecommerce_order_notes_order" ON "ecommerce_order_notes" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_order_notes_created" ON "ecommerce_order_notes" ("created_at");
