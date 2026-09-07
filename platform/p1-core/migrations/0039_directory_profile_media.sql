CREATE TABLE IF NOT EXISTS "directory_profile_media" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" varchar NOT NULL REFERENCES "therapist_profiles"("id") ON DELETE cascade,
  "media_id" varchar REFERENCES "cms_media"("id") ON DELETE set null,
  "url" text NOT NULL,
  "type" text NOT NULL DEFAULT 'image',
  "alt_text" text,
  "caption" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_directory_profile_media_profile" ON "directory_profile_media" ("profile_id");
CREATE INDEX IF NOT EXISTS "idx_directory_profile_media_media" ON "directory_profile_media" ("media_id");
