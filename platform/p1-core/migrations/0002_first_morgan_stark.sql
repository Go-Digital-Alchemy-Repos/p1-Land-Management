ALTER TABLE "provider_application_credentials" ADD COLUMN "middle_name" text;--> statement-breakpoint
ALTER TABLE "provider_application_credentials" ADD COLUMN "verification_url" text;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD COLUMN "current_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD COLUMN "form_data" jsonb DEFAULT '{}'::jsonb;