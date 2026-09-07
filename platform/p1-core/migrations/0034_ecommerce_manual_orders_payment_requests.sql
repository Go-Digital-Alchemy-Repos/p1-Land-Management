ALTER TABLE "ecommerce_orders"
  ADD COLUMN IF NOT EXISTS "manual_payment_method" text,
  ADD COLUMN IF NOT EXISTS "manual_payment_reference" text,
  ADD COLUMN IF NOT EXISTS "manual_payment_marked_by" varchar REFERENCES "users"("id") ON DELETE set null,
  ADD COLUMN IF NOT EXISTS "manual_payment_marked_at" timestamp,
  ADD COLUMN IF NOT EXISTS "fulfillment_mode" text NOT NULL DEFAULT 'shipping';

CREATE TABLE IF NOT EXISTS "ecommerce_payment_requests" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" varchar REFERENCES "ecommerce_orders"("id") ON DELETE set null,
  "customer_id" varchar REFERENCES "ecommerce_customers"("id") ON DELETE set null,
  "customer_email" text NOT NULL,
  "customer_name" text,
  "title" text NOT NULL,
  "description" text,
  "amount" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'usd',
  "status" text NOT NULL DEFAULT 'draft',
  "reason" text NOT NULL,
  "stripe_session_id" text,
  "stripe_payment_intent_id" text,
  "payment_url" text,
  "created_by" varchar REFERENCES "users"("id") ON DELETE set null,
  "paid_at" timestamp,
  "expires_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ecommerce_payment_requests_order" ON "ecommerce_payment_requests" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_payment_requests_customer" ON "ecommerce_payment_requests" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_ecommerce_payment_requests_status" ON "ecommerce_payment_requests" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ecommerce_payment_requests_session" ON "ecommerce_payment_requests" ("stripe_session_id");
