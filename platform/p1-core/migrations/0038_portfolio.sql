CREATE TABLE IF NOT EXISTS "portfolio_projects" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "subtitle" text,
  "location" text,
  "industry" text DEFAULT 'generic' NOT NULL,
  "project_type" text,
  "client_name" text,
  "services" text[],
  "technologies" text[],
  "categories" text[],
  "tags" text[],
  "status" text DEFAULT 'draft' NOT NULL,
  "visibility" text DEFAULT 'public' NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "started_at" timestamp,
  "completed_at" timestamp,
  "published_at" timestamp,
  "summary" text,
  "description" text,
  "challenge" text,
  "solution" text,
  "results" text,
  "testimonial" text,
  "testimonial_author" text,
  "hero_image_url" text,
  "hero_image_alt" text,
  "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "videos" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cta_label" text,
  "cta_url" text,
  "meta_title" text,
  "meta_description" text,
  "noindex" boolean DEFAULT false NOT NULL,
  "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_portfolio_projects_slug" ON "portfolio_projects" ("slug");
CREATE INDEX IF NOT EXISTS "idx_portfolio_projects_public" ON "portfolio_projects" ("status", "visibility", "published_at");
CREATE INDEX IF NOT EXISTS "idx_portfolio_projects_industry" ON "portfolio_projects" ("industry");
CREATE INDEX IF NOT EXISTS "idx_portfolio_projects_featured" ON "portfolio_projects" ("featured");
CREATE INDEX IF NOT EXISTS "idx_portfolio_projects_sort" ON "portfolio_projects" ("sort_order", "updated_at");
