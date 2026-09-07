CREATE TABLE IF NOT EXISTS "client_site_content" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "stack_id" text NOT NULL,
  "route_id" text NOT NULL,
  "component_key" text NOT NULL,
  "draft_content" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "published_content" jsonb,
  "draft_revision" integer NOT NULL DEFAULT 0,
  "published_revision" integer,
  "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "published_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "client_site_content_identity_unique"
  ON "client_site_content" ("stack_id", "route_id", "component_key");
CREATE INDEX IF NOT EXISTS "idx_client_site_content_published"
  ON "client_site_content" ("stack_id", "route_id", "component_key", "published_revision");

CREATE TABLE IF NOT EXISTS "client_site_content_revisions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "content_id" varchar NOT NULL REFERENCES "client_site_content"("id") ON DELETE CASCADE,
  "revision" integer NOT NULL,
  "content" jsonb NOT NULL,
  "kind" text NOT NULL CHECK ("kind" IN ('draft-save', 'publish', 'restore')),
  "changed_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "client_site_content_revision_unique"
  ON "client_site_content_revisions" ("content_id", "revision");
CREATE INDEX IF NOT EXISTS "idx_client_site_content_revisions_created"
  ON "client_site_content_revisions" ("content_id", "created_at");
