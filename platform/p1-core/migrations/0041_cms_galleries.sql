CREATE TABLE IF NOT EXISTS "cms_galleries" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'draft',
  "layout" text NOT NULL DEFAULT 'grid',
  "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_cms_galleries_slug"
  ON "cms_galleries" ("slug");

CREATE INDEX IF NOT EXISTS "idx_cms_galleries_status"
  ON "cms_galleries" ("status");

CREATE INDEX IF NOT EXISTS "idx_cms_galleries_updated_at"
  ON "cms_galleries" ("updated_at");

CREATE TABLE IF NOT EXISTS "cms_gallery_items" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "gallery_id" varchar NOT NULL REFERENCES "cms_galleries"("id") ON DELETE CASCADE,
  "media_id" varchar REFERENCES "cms_media"("id") ON DELETE SET NULL,
  "image_url" text NOT NULL,
  "alt" text,
  "title" text,
  "caption" text,
  "link_url" text,
  "cta_text" text,
  "tags" text[],
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_cms_gallery_items_gallery_id"
  ON "cms_gallery_items" ("gallery_id");

CREATE INDEX IF NOT EXISTS "idx_cms_gallery_items_media_id"
  ON "cms_gallery_items" ("media_id");
