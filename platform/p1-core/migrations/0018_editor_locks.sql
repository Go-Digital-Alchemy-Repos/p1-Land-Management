CREATE TABLE IF NOT EXISTS "editor_locks" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "locked_by_user_id" text NOT NULL,
  "locked_by_name" text NOT NULL,
  "locked_at" timestamp NOT NULL DEFAULT now(),
  "last_heartbeat_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "editor_locks_resource_unique"
ON "editor_locks" ("resource_type", "resource_id");
