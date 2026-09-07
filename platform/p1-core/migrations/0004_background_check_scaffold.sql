ALTER TABLE "provider_background_checks" ADD COLUMN IF NOT EXISTS "vendor_name" text;
ALTER TABLE "provider_background_checks" ADD COLUMN IF NOT EXISTS "vendor_external_id" text;
ALTER TABLE "provider_background_checks" ADD COLUMN IF NOT EXISTS "provider_facing_label" text NOT NULL DEFAULT 'Not Started';
ALTER TABLE "provider_background_checks" ADD COLUMN IF NOT EXISTS "admin_status_details" text;
ALTER TABLE "provider_background_checks" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "provider_background_checks" ADD COLUMN IF NOT EXISTS "requested_at" timestamp;
ALTER TABLE "provider_background_checks" ADD COLUMN IF NOT EXISTS "last_status_sync_at" timestamp;
ALTER TABLE "provider_background_checks" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
ALTER TABLE "provider_background_checks" ALTER COLUMN "status" SET DEFAULT 'not_sent';
