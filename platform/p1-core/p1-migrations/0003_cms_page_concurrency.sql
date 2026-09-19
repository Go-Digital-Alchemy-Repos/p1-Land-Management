ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE cms_menus ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE editor_locks ADD COLUMN IF NOT EXISTS editor_instance_id text;
