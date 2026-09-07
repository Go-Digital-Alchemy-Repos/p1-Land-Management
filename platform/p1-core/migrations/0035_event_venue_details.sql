ALTER TABLE "event_venues" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "event_venues" ADD COLUMN IF NOT EXISTS "parking_info" text;
ALTER TABLE "event_venues" ADD COLUMN IF NOT EXISTS "accessibility_info" text;
ALTER TABLE "event_venues" ADD COLUMN IF NOT EXISTS "transit_info" text;
ALTER TABLE "event_venues" ADD COLUMN IF NOT EXISTS "arrival_notes" text;
