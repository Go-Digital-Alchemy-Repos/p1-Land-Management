CREATE TABLE "provider_application_credentials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"credential_type" text NOT NULL,
	"issuer" text,
	"license_number" text,
	"state_or_country" text,
	"issued_at" timestamp,
	"expires_at" timestamp,
	"document_url" text,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_application_decisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"decision" text NOT NULL,
	"reason" text,
	"decided_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_application_references" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"referee_name" text NOT NULL,
	"referee_email" text NOT NULL,
	"referee_phone" text,
	"relationship" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"response_received_at" timestamp,
	"response_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_application_timeline" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text,
	"performed_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"payment_status" text DEFAULT 'not_started' NOT NULL,
	"references_status" text DEFAULT 'not_started' NOT NULL,
	"background_check_status" text DEFAULT 'not_started' NOT NULL,
	"interview_status" text DEFAULT 'not_started' NOT NULL,
	"decision_status" text DEFAULT 'not_started' NOT NULL,
	"submitted_at" timestamp,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_background_checks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"provider" text,
	"external_id" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"result" text,
	"completed_at" timestamp,
	"report_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_interviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"interviewer_user_id" varchar,
	"format" text DEFAULT 'video',
	"meeting_url" text,
	"notes" text,
	"outcome" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "provider_application_credentials" ADD CONSTRAINT "provider_application_credentials_application_id_provider_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."provider_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_decisions" ADD CONSTRAINT "provider_application_decisions_application_id_provider_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."provider_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_decisions" ADD CONSTRAINT "provider_application_decisions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_references" ADD CONSTRAINT "provider_application_references_application_id_provider_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."provider_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_timeline" ADD CONSTRAINT "provider_application_timeline_application_id_provider_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."provider_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_application_timeline" ADD CONSTRAINT "provider_application_timeline_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_applications" ADD CONSTRAINT "provider_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_background_checks" ADD CONSTRAINT "provider_background_checks_application_id_provider_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."provider_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_interviews" ADD CONSTRAINT "provider_interviews_application_id_provider_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."provider_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_interviews" ADD CONSTRAINT "provider_interviews_interviewer_user_id_users_id_fk" FOREIGN KEY ("interviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pac_app_id" ON "provider_application_credentials" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_pad_app_id" ON "provider_application_decisions" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_par_app_id" ON "provider_application_references" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_pat_app_id" ON "provider_application_timeline" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_pa_user_id" ON "provider_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_pa_status" ON "provider_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pbc_app_id" ON "provider_background_checks" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_pi_app_id" ON "provider_interviews" USING btree ("application_id");