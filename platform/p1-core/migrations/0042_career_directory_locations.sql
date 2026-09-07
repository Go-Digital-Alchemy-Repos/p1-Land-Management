CREATE TABLE IF NOT EXISTS "career_jobs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "department" text,
  "employment_type" text NOT NULL DEFAULT 'full_time',
  "work_mode" text NOT NULL DEFAULT 'on_site',
  "location" text,
  "location_address" text,
  "salary_min" integer,
  "salary_max" integer,
  "salary_currency" text NOT NULL DEFAULT 'USD',
  "salary_period" text NOT NULL DEFAULT 'year',
  "salary_visible" boolean NOT NULL DEFAULT false,
  "status" text NOT NULL DEFAULT 'draft',
  "visibility" text NOT NULL DEFAULT 'public',
  "summary" text,
  "description" text,
  "requirements" text,
  "benefits" text,
  "application_instructions" text,
  "published_at" timestamp,
  "closes_at" timestamp,
  "meta_title" text,
  "meta_description" text,
  "noindex" boolean NOT NULL DEFAULT false,
  "integration_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "career_jobs"
  ADD COLUMN IF NOT EXISTS "directory_profile_id" varchar REFERENCES "therapist_profiles"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_career_jobs_slug"
  ON "career_jobs" ("slug");
CREATE INDEX IF NOT EXISTS "idx_career_jobs_public"
  ON "career_jobs" ("status", "visibility", "published_at");
CREATE INDEX IF NOT EXISTS "idx_career_jobs_department"
  ON "career_jobs" ("department");
CREATE INDEX IF NOT EXISTS "idx_career_jobs_location"
  ON "career_jobs" ("location");
CREATE INDEX IF NOT EXISTS "idx_career_jobs_directory_profile"
  ON "career_jobs" ("directory_profile_id");
CREATE INDEX IF NOT EXISTS "idx_career_jobs_updated_at"
  ON "career_jobs" ("updated_at");

CREATE TABLE IF NOT EXISTS "career_applications" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "job_id" varchar NOT NULL REFERENCES "career_jobs"("id") ON DELETE CASCADE,
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
  "status" text NOT NULL DEFAULT 'new',
  "source" text NOT NULL DEFAULT 'website',
  "consent_accepted" boolean NOT NULL DEFAULT false,
  "ip_address" text,
  "user_agent" text,
  "integration_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_career_applications_job"
  ON "career_applications" ("job_id");
CREATE INDEX IF NOT EXISTS "idx_career_applications_status"
  ON "career_applications" ("status");
CREATE INDEX IF NOT EXISTS "idx_career_applications_created"
  ON "career_applications" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_career_applications_email"
  ON "career_applications" ("email");

CREATE TABLE IF NOT EXISTS "career_application_notes" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" varchar NOT NULL REFERENCES "career_applications"("id") ON DELETE CASCADE,
  "note" text NOT NULL,
  "status_from" text,
  "status_to" text,
  "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_career_application_notes_application"
  ON "career_application_notes" ("application_id");
CREATE INDEX IF NOT EXISTS "idx_career_application_notes_created"
  ON "career_application_notes" ("created_at");
