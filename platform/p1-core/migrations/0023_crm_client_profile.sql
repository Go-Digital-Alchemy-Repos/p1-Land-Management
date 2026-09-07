ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "client_type" text NOT NULL DEFAULT 'individual';
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "primary_email" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "secondary_email" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "primary_phone" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "alternate_phone" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "preferred_contact_method" text NOT NULL DEFAULT 'no_preference';
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "address_line_1" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "address_line_2" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "region" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "postal_code" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "legal_name" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "website" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "industry" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "company_size" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "business_type" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "company_phone" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "company_email" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "billing_contact_name" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "billing_email" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "billing_phone" text;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "account_owner_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "onboarding_status" text NOT NULL DEFAULT 'not_started';
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "service_start_date" timestamp;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "renewal_date" timestamp;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "client_since" timestamp;
ALTER TABLE "crm_clients" ADD COLUMN IF NOT EXISTS "internal_tags" jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE "crm_clients"
SET
  "client_type" = CASE WHEN NULLIF(trim(COALESCE("company", '')), '') IS NULL THEN 'individual' ELSE 'business' END,
  "primary_email" = COALESCE("primary_email", "email"),
  "primary_phone" = COALESCE("primary_phone", "phone"),
  "company_name" = COALESCE("company_name", "company"),
  "client_since" = COALESCE("client_since", "created_at"),
  "preferred_contact_method" = CASE
    WHEN "preferred_contact_method" IS NOT NULL AND "preferred_contact_method" <> 'no_preference' THEN "preferred_contact_method"
    WHEN NULLIF(trim(COALESCE("email", '')), '') IS NOT NULL THEN 'email'
    WHEN NULLIF(trim(COALESCE("phone", '')), '') IS NOT NULL THEN 'phone'
    ELSE 'no_preference'
  END;

CREATE INDEX IF NOT EXISTS "idx_crm_clients_client_type" ON "crm_clients" ("client_type");
CREATE INDEX IF NOT EXISTS "idx_crm_clients_company_name" ON "crm_clients" ("company_name");
CREATE INDEX IF NOT EXISTS "idx_crm_clients_account_owner" ON "crm_clients" ("account_owner_id");
