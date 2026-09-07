CREATE TABLE IF NOT EXISTS "team_members" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "role" text NOT NULL DEFAULT '',
  "biography" text NOT NULL DEFAULT '',
  "excerpt" text NOT NULL DEFAULT '',
  "photo_url" text NOT NULL DEFAULT '',
  "photo_alt" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'draft',
  "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_team_members_status" ON "team_members" ("status");
