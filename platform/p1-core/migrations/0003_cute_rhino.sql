CREATE TABLE "cms_menus" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text DEFAULT 'unassigned' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "provider_background_checks" ALTER COLUMN "status" SET DEFAULT 'not_sent';--> statement-breakpoint
ALTER TABLE "provider_application_references" ADD COLUMN "secure_token" varchar(128);--> statement-breakpoint
ALTER TABLE "provider_application_references" ADD COLUMN "applicant_name_snapshot" text;--> statement-breakpoint
ALTER TABLE "provider_application_references" ADD COLUMN "email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "provider_application_references" ADD COLUMN "opened_at" timestamp;--> statement-breakpoint
ALTER TABLE "provider_application_references" ADD COLUMN "concern_flags" jsonb;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD COLUMN "submitted_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD COLUMN "amount_paid" integer;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD COLUMN "refund_eligible_amount" integer;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD COLUMN "refund_status" text;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "provider_background_checks" ADD COLUMN "vendor_name" text;--> statement-breakpoint
ALTER TABLE "provider_background_checks" ADD COLUMN "vendor_external_id" text;--> statement-breakpoint
ALTER TABLE "provider_background_checks" ADD COLUMN "provider_facing_label" text DEFAULT 'Not Started' NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_background_checks" ADD COLUMN "admin_status_details" text;--> statement-breakpoint
ALTER TABLE "provider_background_checks" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "provider_background_checks" ADD COLUMN "requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "provider_background_checks" ADD COLUMN "last_status_sync_at" timestamp;--> statement-breakpoint
ALTER TABLE "provider_background_checks" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
CREATE INDEX "idx_par_token" ON "provider_application_references" USING btree ("secure_token");