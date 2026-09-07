CREATE TABLE IF NOT EXISTS "event_venues" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "address" text,
  "city" text,
  "region" text,
  "postal_code" text,
  "country" text,
  "phone" text,
  "website_url" text,
  "latitude" text,
  "longitude" text,
  "is_virtual" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "event_venues_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "event_organizers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "email" text,
  "phone" text,
  "website_url" text,
  "image_url" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "event_organizers_slug_unique" UNIQUE("slug")
);

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_id" varchar;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "organizer_id" varchar;

DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_event_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."event_venues"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_event_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."event_organizers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_event_venues_slug" ON "event_venues" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "idx_event_venues_name" ON "event_venues" USING btree ("name");
CREATE INDEX IF NOT EXISTS "idx_event_organizers_slug" ON "event_organizers" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "idx_event_organizers_name" ON "event_organizers" USING btree ("name");
CREATE INDEX IF NOT EXISTS "idx_events_venue_id" ON "events" USING btree ("venue_id");
CREATE INDEX IF NOT EXISTS "idx_events_organizer_id" ON "events" USING btree ("organizer_id");
