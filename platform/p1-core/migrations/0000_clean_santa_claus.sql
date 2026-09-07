CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"action" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image_url" text,
	"author_name" text NOT NULL,
	"category" varchar(100),
	"tags" text[],
	"post_type" text DEFAULT 'article',
	"podcast_url" text,
	"external_url" text,
	"is_published" boolean DEFAULT false,
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
CREATE TABLE "cms_media" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"r2_key" text,
	"alt" text,
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now()
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
	"content" jsonb DEFAULT '{}'::jsonb,
	"seo_title" text,
	"seo_description" text,
	"seo_keywords" text,
	"og_image_url" text,
	"canonical_url" text,
	"noindex" boolean DEFAULT false,
	"created_by" varchar,
	"updated_by" varchar,
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
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"professional_id" varchar NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"content" text NOT NULL,
	"content_html" text,
	"attachment_url" text,
	"attachment_name" text,
	"attachment_type" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
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
	"user_id" varchar NOT NULL,
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
	"canceled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"end_date" timestamp,
	"location" text,
	"is_virtual" boolean DEFAULT false,
	"zoom_link" text,
	"member_only" boolean DEFAULT false,
	"image_url" text,
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
	"timezone" text,
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
	"parent_event_id" varchar
);
--> statement-breakpoint
CREATE TABLE "guest_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" varchar NOT NULL,
	"sender_name" text,
	"contact_method" text NOT NULL,
	"contact_value" text NOT NULL,
	"message" text NOT NULL,
	"age_acknowledged" boolean DEFAULT false NOT NULL,
	"phi_acknowledged" boolean DEFAULT false NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "membership_tiers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"monthly_price" integer NOT NULL,
	"annual_price" integer NOT NULL,
	"features" text[],
	"is_active" boolean DEFAULT true,
	"stripe_price_id_monthly" text,
	"stripe_price_id_annual" text,
	"sort_order" integer DEFAULT 0,
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
CREATE TABLE "profile_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar NOT NULL,
	"viewer_id" varchar,
	"source" text,
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE "saved_professionals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"profile_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "uq_sc_user_profile" UNIQUE("user_id","profile_id")
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
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "specializations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "specializations_name_unique" UNIQUE("name")
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
CREATE TABLE "therapist_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
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
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "therapist_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"therapist_id" varchar NOT NULL,
	"tier_id" varchar,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'inactive' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"custom_price" integer,
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
	"role" text DEFAULT 'client' NOT NULL,
	"profile_image_url" text,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_media" ADD CONSTRAINT "cms_media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_page_revisions" ADD CONSTRAINT "cms_page_revisions_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_page_revisions" ADD CONSTRAINT "cms_page_revisions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_sections" ADD CONSTRAINT "cms_sections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docs" ADD CONSTRAINT "docs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_messages" ADD CONSTRAINT "guest_messages_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profile_id_therapist_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."therapist_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_purchases" ADD CONSTRAINT "recording_purchases_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recording_purchases" ADD CONSTRAINT "recording_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_professionals" ADD CONSTRAINT "saved_professionals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_professionals" ADD CONSTRAINT "saved_professionals_profile_id_therapist_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."therapist_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapist_profiles" ADD CONSTRAINT "therapist_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapist_subscriptions" ADD CONSTRAINT "therapist_subscriptions_therapist_id_users_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapist_subscriptions" ADD CONSTRAINT "therapist_subscriptions_tier_id_membership_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_user_date" ON "activity_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_slug" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_published" ON "blog_posts" USING btree ("is_published","published_at");--> statement-breakpoint
CREATE INDEX "idx_cms_media_created_at" ON "cms_media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_cms_page_revisions_page_id" ON "cms_page_revisions" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cms_pages_slug" ON "cms_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_cms_pages_status" ON "cms_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cms_sections_category" ON "cms_sections" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_cms_sections_created_at" ON "cms_sections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_conv_client_id" ON "conversations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_conv_counselor_id" ON "conversations" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "idx_conv_updated_at" ON "conversations" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_conv_participants" ON "conversations" USING btree ("client_id","professional_id");--> statement-breakpoint
CREATE INDEX "idx_conv_last_message" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "idx_dm_conv_date" ON "direct_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_dm_conv_read_sender" ON "direct_messages" USING btree ("conversation_id","is_read","sender_id");--> statement-breakpoint
CREATE INDEX "idx_er_event_id" ON "event_registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_er_user_id" ON "event_registrations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_er_event_user" ON "event_registrations" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_events_date" ON "events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_guest_msg_counselor" ON "guest_messages" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "idx_guest_msg_read" ON "guest_messages" USING btree ("professional_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_guest_msg_created" ON "guest_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notif_user_date" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notif_user_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_pv_profile_id" ON "profile_views" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_pv_profile_date" ON "profile_views" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_pv_viewer_id" ON "profile_views" USING btree ("viewer_id");--> statement-breakpoint
CREATE INDEX "idx_rp_event_id" ON "recording_purchases" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_rp_user_id" ON "recording_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rp_event_user" ON "recording_purchases" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_sc_user_id" ON "saved_professionals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sc_profile_id" ON "saved_professionals" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_tp_user_id" ON "therapist_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tp_visibility" ON "therapist_profiles" USING btree ("is_approved","is_active");--> statement-breakpoint
CREATE INDEX "idx_tp_country" ON "therapist_profiles" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_tp_practice_mode" ON "therapist_profiles" USING btree ("practice_mode");--> statement-breakpoint
CREATE INDEX "idx_tp_featured" ON "therapist_profiles" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "idx_sub_therapist_id" ON "therapist_subscriptions" USING btree ("therapist_id");--> statement-breakpoint
CREATE INDEX "idx_sub_stripe_sub_id" ON "therapist_subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_sub_status" ON "therapist_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");