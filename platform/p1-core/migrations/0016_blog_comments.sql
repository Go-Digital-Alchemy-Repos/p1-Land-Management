CREATE TABLE IF NOT EXISTS "blog_comments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" varchar NOT NULL REFERENCES "blog_posts"("id") ON DELETE cascade,
  "user_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "author_name" text NOT NULL,
  "author_email" text,
  "body" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "ip_hash" text,
  "user_agent" text,
  "moderation_note" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_blog_comments_post_status"
  ON "blog_comments" ("post_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "idx_blog_comments_status"
  ON "blog_comments" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "idx_blog_comments_user"
  ON "blog_comments" ("user_id");
