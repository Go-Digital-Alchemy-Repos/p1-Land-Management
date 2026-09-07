ALTER TABLE "ecommerce_customers" ADD COLUMN IF NOT EXISTS "marketing_email_opt_in" boolean NOT NULL DEFAULT false;
ALTER TABLE "ecommerce_customers" ADD COLUMN IF NOT EXISTS "order_sms_opt_in" boolean NOT NULL DEFAULT false;
