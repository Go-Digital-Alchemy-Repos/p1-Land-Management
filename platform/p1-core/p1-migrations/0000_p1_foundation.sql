CREATE TABLE "therapist_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"directory_mode" text DEFAULT 'therapists' NOT NULL,
	"title" text,
	"bio" text,
	"specializations" text[],
	"languages" text[],
	"credentials" text,
	"license_number" text,
	"practice_mode" text DEFAULT 'both',
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"state" text,
	"country" text,
	"zip_code" text,
	"latitude" numeric,
	"longitude" numeric,
	"phone" text,
	"website" text,
	"instagram_handle" text,
	"facebook_handle" text,
	"twitter_handle" text,
	"linkedin_handle" text,
	"youtube_handle" text,
	"tiktok_handle" text,
	"accepting_clients" boolean DEFAULT true,
	"willing_to_travel" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"featured_until" timestamp,
	"is_approved" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"rejection_reason" text,
	"search_vector" "tsvector",
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"user_id" varchar,
	"author_name" text NOT NULL,
	"author_email" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"moderation_note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image_url" text,
	"cover_image_position_x" integer DEFAULT 50,
	"cover_image_position_y" integer DEFAULT 50,
	"author_name" text NOT NULL,
	"category" varchar(100),
	"categories" text[],
	"tags" text[],
	"post_type" text DEFAULT 'article',
	"podcast_url" text,
	"external_url" text,
	"sidebar_id" varchar,
	"is_published" boolean DEFAULT false,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"seo_title" text,
	"seo_description" text,
	"og_image_url" text,
	"noindex" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_taxonomies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"type" text NOT NULL,
	"parent_id" varchar,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "career_application_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" varchar NOT NULL,
	"note" text NOT NULL,
	"status_from" text,
	"status_to" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"cover_letter" text,
	"linkedin_url" text,
	"portfolio_url" text,
	"resume_file_name" text NOT NULL,
	"resume_mime_type" text NOT NULL,
	"resume_file_size" integer NOT NULL,
	"resume_storage_key" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"consent_accepted" boolean DEFAULT false NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"integration_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"department" text,
	"employment_type" text DEFAULT 'full_time' NOT NULL,
	"work_mode" text DEFAULT 'on_site' NOT NULL,
	"location" text,
	"location_address" text,
	"directory_profile_id" varchar,
	"salary_min" integer,
	"salary_max" integer,
	"salary_currency" text DEFAULT 'USD' NOT NULL,
	"salary_period" text DEFAULT 'year' NOT NULL,
	"salary_visible" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"summary" text,
	"description" text,
	"requirements" text,
	"benefits" text,
	"application_instructions" text,
	"published_at" timestamp,
	"closes_at" timestamp,
	"meta_title" text,
	"meta_description" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"integration_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" varchar,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_site_content" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stack_id" text NOT NULL,
	"route_id" text NOT NULL,
	"component_key" text NOT NULL,
	"draft_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_content" jsonb,
	"draft_revision" integer DEFAULT 0 NOT NULL,
	"published_revision" integer,
	"created_by" varchar,
	"updated_by" varchar,
	"published_by" varchar,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_site_content_revisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" varchar NOT NULL,
	"revision" integer NOT NULL,
	"content" jsonb NOT NULL,
	"kind" text NOT NULL,
	"changed_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_stack_onboarding_evidence" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stack_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"recorded_by_user_id" varchar,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_galleries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"layout" text DEFAULT 'grid' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" varchar,
	"updated_by" varchar,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_gallery_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gallery_id" varchar NOT NULL,
	"media_id" varchar,
	"image_url" text NOT NULL,
	"alt" text,
	"title" text,
	"caption" text,
	"link_url" text,
	"cta_text" text,
	"tags" text[],
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_media" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"title" text,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"r2_key" text,
	"alt" text,
	"caption" text,
	"description" text,
	"seo_title" text,
	"seo_description" text,
	"og_title" text,
	"og_description" text,
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_menus" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text DEFAULT 'unassigned' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_page_revisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb,
	"status" text NOT NULL,
	"changed_by" varchar,
	"change_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"page_type" text DEFAULT 'custom' NOT NULL,
	"template" text DEFAULT 'full-width' NOT NULL,
	"sidebar_id" varchar,
	"content" jsonb DEFAULT '{}'::jsonb,
	"seo_title" text,
	"seo_description" text,
	"seo_keywords" text,
	"og_image_url" text,
	"canonical_url" text,
	"noindex" boolean DEFAULT false,
	"created_by" varchar,
	"updated_by" varchar,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_sections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general',
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"thumbnail_url" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_sidebars" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false,
	"widgets" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_client_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"body" text NOT NULL,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_client_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp,
	"completed" boolean DEFAULT false NOT NULL,
	"assigned_to_id" varchar,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_lead_id" varchar,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"client_type" text DEFAULT 'individual' NOT NULL,
	"primary_email" text,
	"secondary_email" text,
	"primary_phone" text,
	"alternate_phone" text,
	"preferred_contact_method" text DEFAULT 'no_preference' NOT NULL,
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"company_name" text,
	"legal_name" text,
	"website" text,
	"industry" text,
	"company_size" text,
	"business_type" text,
	"company_phone" text,
	"company_email" text,
	"billing_contact_name" text,
	"billing_email" text,
	"billing_phone" text,
	"account_owner_id" varchar,
	"onboarding_status" text DEFAULT 'not_started' NOT NULL,
	"service_start_date" timestamp,
	"renewal_date" timestamp,
	"client_since" timestamp,
	"internal_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'onboarding' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"form_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"owner_id" varchar,
	"next_follow_up_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "crm_clients_source_lead_id_unique" UNIQUE("source_lead_id")
);
--> statement-breakpoint
CREATE TABLE "crm_lead_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"body" text NOT NULL,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_lead_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp,
	"completed" boolean DEFAULT false NOT NULL,
	"assigned_to_id" varchar,
	"created_by_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"message" text,
	"stage" text DEFAULT 'new' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"form_submission_id" varchar,
	"form_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"owner_id" varchar,
	"next_follow_up_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "docs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"content" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_published" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "docs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "editor_locks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"locked_by_user_id" text NOT NULL,
	"locked_by_name" text NOT NULL,
	"locked_at" timestamp DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"module" text DEFAULT 'system' NOT NULL,
	"subject" text NOT NULL,
	"html_body" text NOT NULL,
	"description" text NOT NULL,
	"variables" text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"payment_status" text DEFAULT 'not_required',
	"payment_intent_id" text,
	"stripe_checkout_session_id" text,
	"amount_paid" integer,
	"notes" text,
	"attended" boolean DEFAULT false,
	"checked_in_at" timestamp,
	"registered_at" timestamp DEFAULT now(),
	"canceled_at" timestamp,
	"reminder_sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "event_organizers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"email" text,
	"phone" text,
	"website_url" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "event_organizers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_venues" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"address" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"phone" text,
	"email" text,
	"website_url" text,
	"latitude" text,
	"longitude" text,
	"parking_info" text,
	"accessibility_info" text,
	"transit_info" text,
	"arrival_notes" text,
	"is_virtual" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "event_venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"end_date" timestamp,
	"location" text,
	"is_virtual" boolean DEFAULT false,
	"zoom_link" text,
	"member_only" boolean DEFAULT false,
	"image_url" text,
	"image_position_x" integer DEFAULT 50,
	"image_position_y" integer DEFAULT 50,
	"created_at" timestamp DEFAULT now(),
	"virtual_join_url" text,
	"virtual_dial_in_info" text,
	"recording_url" text,
	"show_in_archives" boolean DEFAULT false,
	"recording_access" text DEFAULT 'free',
	"recording_price" integer,
	"registration_enabled" boolean DEFAULT false,
	"registration_type" text DEFAULT 'free',
	"registration_fee" integer,
	"registration_currency" text DEFAULT 'usd',
	"registration_opens_at" timestamp,
	"registration_closes_at" timestamp,
	"capacity" integer,
	"waitlist_enabled" boolean DEFAULT false,
	"status" text DEFAULT 'published',
	"visibility" text DEFAULT 'public',
	"event_type" text,
	"category" text,
	"audience" text,
	"format" text,
	"delivery_mode" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"registration_form_id" varchar,
	"registration_approval_mode" text DEFAULT 'automatic',
	"timezone" text,
	"venue_id" varchar,
	"organizer_id" varchar,
	"location_name" text,
	"location_address" text,
	"latitude" text,
	"longitude" text,
	"speaker_name" text,
	"speaker_bio" text,
	"speaker_image_url" text,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" text,
	"recurrence_interval" integer,
	"recurrence_days_of_week" text,
	"recurrence_end_date" timestamp,
	"recurrence_count" integer,
	"parent_event_id" varchar,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cms_form_effect_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" varchar NOT NULL,
	"deduplication_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"processing_token" varchar,
	"claimed_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error_code" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_form_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" varchar NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text,
	"idempotency_key" varchar(128),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_forms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"kind" text DEFAULT 'custom' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"email_new_message" boolean DEFAULT true NOT NULL,
	"in_app_new_message" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'new_message' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"link_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "recording_purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_checkout_session_id" text,
	"amount_paid" integer,
	"purchased_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seo_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_name" text DEFAULT 'Core Platform',
	"title_suffix" text DEFAULT ' | Core Platform',
	"default_meta_description" text,
	"site_url" text,
	"default_og_image_url" text,
	"organization_name" text DEFAULT 'Core Platform',
	"organization_logo_url" text,
	"facebook_url" text,
	"twitter_handle" text,
	"linkedin_url" text,
	"instagram_url" text,
	"default_robots_noindex" boolean DEFAULT false,
	"custom_robots_txt" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"category" text NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"biography" text DEFAULT '' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"photo_url" text DEFAULT '' NOT NULL,
	"photo_alt" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" varchar,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" text DEFAULT 'therapist' NOT NULL,
	"admin_permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"form_notification_form_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"profile_image_url" text,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "p1_acquisition_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "p1_acquisition_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event" text NOT NULL,
	"path" text NOT NULL,
	"source" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "therapist_profiles" ADD CONSTRAINT "therapist_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_application_notes" ADD CONSTRAINT "career_application_notes_application_id_career_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."career_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_application_notes" ADD CONSTRAINT "career_application_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_applications" ADD CONSTRAINT "career_applications_job_id_career_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."career_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_jobs" ADD CONSTRAINT "career_jobs_directory_profile_id_therapist_profiles_id_fk" FOREIGN KEY ("directory_profile_id") REFERENCES "public"."therapist_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_jobs" ADD CONSTRAINT "career_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_jobs" ADD CONSTRAINT "career_jobs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_site_content" ADD CONSTRAINT "client_site_content_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_site_content" ADD CONSTRAINT "client_site_content_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_site_content" ADD CONSTRAINT "client_site_content_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_site_content_revisions" ADD CONSTRAINT "client_site_content_revisions_content_id_client_site_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."client_site_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_site_content_revisions" ADD CONSTRAINT "client_site_content_revisions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_stack_onboarding_evidence" ADD CONSTRAINT "client_stack_onboarding_evidence_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_galleries" ADD CONSTRAINT "cms_galleries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_galleries" ADD CONSTRAINT "cms_galleries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_gallery_items" ADD CONSTRAINT "cms_gallery_items_gallery_id_cms_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."cms_galleries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_gallery_items" ADD CONSTRAINT "cms_gallery_items_media_id_cms_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."cms_media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_media" ADD CONSTRAINT "cms_media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_page_revisions" ADD CONSTRAINT "cms_page_revisions_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_page_revisions" ADD CONSTRAINT "cms_page_revisions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_sections" ADD CONSTRAINT "cms_sections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_client_notes" ADD CONSTRAINT "crm_client_notes_client_id_crm_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."crm_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_client_notes" ADD CONSTRAINT "crm_client_notes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_client_tasks" ADD CONSTRAINT "crm_client_tasks_client_id_crm_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."crm_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_client_tasks" ADD CONSTRAINT "crm_client_tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_client_tasks" ADD CONSTRAINT "crm_client_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_clients" ADD CONSTRAINT "crm_clients_source_lead_id_crm_leads_id_fk" FOREIGN KEY ("source_lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_clients" ADD CONSTRAINT "crm_clients_account_owner_id_users_id_fk" FOREIGN KEY ("account_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_clients" ADD CONSTRAINT "crm_clients_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_notes" ADD CONSTRAINT "crm_lead_notes_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_notes" ADD CONSTRAINT "crm_lead_notes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_tasks" ADD CONSTRAINT "crm_lead_tasks_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_tasks" ADD CONSTRAINT "crm_lead_tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_lead_tasks" ADD CONSTRAINT "crm_lead_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_form_submission_id_cms_form_submissions_id_fk" FOREIGN KEY ("form_submission_id") REFERENCES "public"."cms_form_submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs" ADD CONSTRAINT "docs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_registration_form_id_cms_forms_id_fk" FOREIGN KEY ("registration_form_id") REFERENCES "public"."cms_forms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_parent_event_id_events_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_event_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."event_venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_event_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."event_organizers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_form_effect_jobs" ADD CONSTRAINT "cms_form_effect_jobs_submission_id_cms_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."cms_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_form_submissions" ADD CONSTRAINT "cms_form_submissions_form_id_cms_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."cms_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_purchases" ADD CONSTRAINT "recording_purchases_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_purchases" ADD CONSTRAINT "recording_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tp_user_id" ON "therapist_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tp_directory_mode" ON "therapist_profiles" USING btree ("directory_mode");--> statement-breakpoint
CREATE INDEX "idx_tp_visibility" ON "therapist_profiles" USING btree ("is_approved","is_active");--> statement-breakpoint
CREATE INDEX "idx_tp_country" ON "therapist_profiles" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_tp_practice_mode" ON "therapist_profiles" USING btree ("practice_mode");--> statement-breakpoint
CREATE INDEX "idx_tp_featured" ON "therapist_profiles" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "idx_tp_specializations_gin" ON "therapist_profiles" USING gin ("specializations");--> statement-breakpoint
CREATE INDEX "idx_tp_languages_gin" ON "therapist_profiles" USING gin ("languages");--> statement-breakpoint
CREATE INDEX "idx_tp_directory_filter" ON "therapist_profiles" USING btree ("is_approved","is_active","practice_mode","accepting_clients");--> statement-breakpoint
CREATE INDEX "idx_activity_user_date" ON "activity_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_blog_comments_post_status" ON "blog_comments" USING btree ("post_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_blog_comments_status" ON "blog_comments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_blog_comments_user" ON "blog_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_slug" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_published" ON "blog_posts" USING btree ("is_published","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_blog_taxonomies_type_slug_unique" ON "blog_taxonomies" USING btree ("type","slug");--> statement-breakpoint
CREATE INDEX "idx_blog_taxonomies_type" ON "blog_taxonomies" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_blog_taxonomies_parent" ON "blog_taxonomies" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_career_application_notes_application" ON "career_application_notes" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_career_application_notes_created" ON "career_application_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_career_applications_job" ON "career_applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_career_applications_status" ON "career_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_career_applications_created" ON "career_applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_career_applications_email" ON "career_applications" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_career_jobs_slug" ON "career_jobs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_career_jobs_public" ON "career_jobs" USING btree ("status","visibility","published_at");--> statement-breakpoint
CREATE INDEX "idx_career_jobs_department" ON "career_jobs" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_career_jobs_location" ON "career_jobs" USING btree ("location");--> statement-breakpoint
CREATE INDEX "idx_career_jobs_directory_profile" ON "career_jobs" USING btree ("directory_profile_id");--> statement-breakpoint
CREATE INDEX "idx_career_jobs_updated_at" ON "career_jobs" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "client_site_content_identity_unique" ON "client_site_content" USING btree ("stack_id","route_id","component_key");--> statement-breakpoint
CREATE INDEX "idx_client_site_content_published" ON "client_site_content" USING btree ("stack_id","route_id","component_key","published_revision");--> statement-breakpoint
CREATE UNIQUE INDEX "client_site_content_revision_unique" ON "client_site_content_revisions" USING btree ("content_id","revision");--> statement-breakpoint
CREATE INDEX "idx_client_site_content_revisions_created" ON "client_site_content_revisions" USING btree ("content_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_client_stack_onboarding_evidence_stack_recorded" ON "client_stack_onboarding_evidence" USING btree ("stack_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cms_galleries_slug" ON "cms_galleries" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_cms_galleries_status" ON "cms_galleries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cms_galleries_updated_at" ON "cms_galleries" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_cms_gallery_items_gallery_id" ON "cms_gallery_items" USING btree ("gallery_id");--> statement-breakpoint
CREATE INDEX "idx_cms_gallery_items_media_id" ON "cms_gallery_items" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "idx_cms_media_created_at" ON "cms_media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_cms_page_revisions_page_id" ON "cms_page_revisions" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cms_pages_slug" ON "cms_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_cms_pages_status" ON "cms_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cms_sections_category" ON "cms_sections" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_cms_sections_created_at" ON "cms_sections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_cms_sidebars_default" ON "cms_sidebars" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "idx_cms_sidebars_updated_at" ON "cms_sidebars" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_contact_messages_created_at" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_crm_client_notes_client_id" ON "crm_client_notes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_crm_client_notes_created_at" ON "crm_client_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_crm_client_tasks_client_id" ON "crm_client_tasks" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_crm_client_tasks_due_at" ON "crm_client_tasks" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "idx_crm_client_tasks_completed" ON "crm_client_tasks" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "idx_crm_clients_source_lead" ON "crm_clients" USING btree ("source_lead_id");--> statement-breakpoint
CREATE INDEX "idx_crm_clients_status" ON "crm_clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_crm_clients_email" ON "crm_clients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_crm_clients_phone" ON "crm_clients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_crm_clients_client_type" ON "crm_clients" USING btree ("client_type");--> statement-breakpoint
CREATE INDEX "idx_crm_clients_company_name" ON "crm_clients" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "idx_crm_clients_account_owner" ON "crm_clients" USING btree ("account_owner_id");--> statement-breakpoint
CREATE INDEX "idx_crm_clients_owner" ON "crm_clients" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_crm_clients_created_at" ON "crm_clients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_crm_lead_notes_lead_id" ON "crm_lead_notes" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_crm_lead_notes_created_at" ON "crm_lead_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_crm_lead_tasks_lead_id" ON "crm_lead_tasks" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_crm_lead_tasks_due_at" ON "crm_lead_tasks" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "idx_crm_lead_tasks_completed" ON "crm_lead_tasks" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_stage" ON "crm_leads" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_email" ON "crm_leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_phone" ON "crm_leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_source" ON "crm_leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_created_at" ON "crm_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_crm_leads_owner" ON "crm_leads" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "editor_locks_resource_unique" ON "editor_locks" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_er_event_id" ON "event_registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_er_user_id" ON "event_registrations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_er_event_user" ON "event_registrations" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_er_event_email" ON "event_registrations" USING btree ("event_id","email");--> statement-breakpoint
CREATE INDEX "idx_event_organizers_slug" ON "event_organizers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_event_organizers_name" ON "event_organizers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_event_venues_slug" ON "event_venues" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_event_venues_name" ON "event_venues" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_events_date" ON "events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_events_slug" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_events_status_visibility" ON "events" USING btree ("status","visibility");--> statement-breakpoint
CREATE INDEX "idx_events_type_category" ON "events" USING btree ("event_type","category");--> statement-breakpoint
CREATE INDEX "idx_events_registration_form_id" ON "events" USING btree ("registration_form_id");--> statement-breakpoint
CREATE INDEX "idx_events_venue_id" ON "events" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "idx_events_organizer_id" ON "events" USING btree ("organizer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cms_form_effect_jobs_deduplication" ON "cms_form_effect_jobs" USING btree ("submission_id","deduplication_key");--> statement-breakpoint
CREATE INDEX "idx_cms_form_effect_jobs_ready" ON "cms_form_effect_jobs" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_cms_form_submissions_form_id" ON "cms_form_submissions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "idx_cms_form_submissions_created_at" ON "cms_form_submissions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cms_form_submissions_form_idempotency_key" ON "cms_form_submissions" USING btree ("form_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cms_forms_slug_unique" ON "cms_forms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_cms_forms_kind" ON "cms_forms" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_cms_forms_updated_at" ON "cms_forms" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_notif_user_date" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notif_user_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_rp_event_id" ON "recording_purchases" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_rp_user_id" ON "recording_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rp_event_user" ON "recording_purchases" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_team_members_status" ON "team_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "p1_events_created" ON "p1_acquisition_events" USING btree ("created_at");