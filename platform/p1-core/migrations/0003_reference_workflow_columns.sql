ALTER TABLE "provider_application_references" ADD COLUMN IF NOT EXISTS "secure_token" varchar(128);
ALTER TABLE "provider_application_references" ADD COLUMN IF NOT EXISTS "applicant_name_snapshot" text;
ALTER TABLE "provider_application_references" ADD COLUMN IF NOT EXISTS "email_sent_at" timestamp;
ALTER TABLE "provider_application_references" ADD COLUMN IF NOT EXISTS "opened_at" timestamp;
ALTER TABLE "provider_application_references" ADD COLUMN IF NOT EXISTS "concern_flags" jsonb;
CREATE INDEX IF NOT EXISTS "idx_par_token" ON "provider_application_references" ("secure_token");
