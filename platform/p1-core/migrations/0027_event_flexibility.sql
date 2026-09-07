ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "audience" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "format" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "delivery_mode" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "registration_form_id" varchar;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "registration_approval_mode" text DEFAULT 'automatic';

DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_registration_form_id_cms_forms_id_fk" FOREIGN KEY ("registration_form_id") REFERENCES "public"."cms_forms"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_events_type_category" ON "events" USING btree ("event_type","category");
CREATE INDEX IF NOT EXISTS "idx_events_registration_form_id" ON "events" USING btree ("registration_form_id");
