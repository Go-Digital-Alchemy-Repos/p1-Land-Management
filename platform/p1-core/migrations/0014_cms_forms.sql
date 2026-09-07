CREATE TABLE IF NOT EXISTS "cms_forms" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "kind" text NOT NULL DEFAULT 'custom',
  "is_system" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "fields" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_cms_forms_slug_unique" ON "cms_forms" ("slug");
CREATE INDEX IF NOT EXISTS "idx_cms_forms_kind" ON "cms_forms" ("kind");
CREATE INDEX IF NOT EXISTS "idx_cms_forms_updated_at" ON "cms_forms" ("updated_at");

CREATE TABLE IF NOT EXISTS "cms_form_submissions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" varchar NOT NULL REFERENCES "cms_forms"("id") ON DELETE CASCADE,
  "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "source" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_cms_form_submissions_form_id" ON "cms_form_submissions" ("form_id");
CREATE INDEX IF NOT EXISTS "idx_cms_form_submissions_created_at" ON "cms_form_submissions" ("created_at");
