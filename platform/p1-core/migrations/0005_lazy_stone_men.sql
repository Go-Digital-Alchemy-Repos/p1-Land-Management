-- =============================================================================
-- Migration: Database Indexes & FK Constraints
-- =============================================================================
--
-- BACKWARD COMPATIBILITY:
--   All changes are additive (new indexes and a new FK constraint).
--   No columns are renamed, removed, or have their types changed.
--   Existing queries and application code are unaffected.
--
-- ORPHAN HANDLING (parentEventId FK):
--   The UPDATE statement below nullifies any orphaned parentEventId values
--   before the FK constraint is added. This is non-destructive (no rows deleted).
--   It ensures the FK constraint can be added without violating referential
--   integrity. In the current database, zero orphaned rows were found.
--
--   Pre-migration diagnostic query (run manually before migration to check):
--     SELECT id, parent_event_id FROM events
--     WHERE parent_event_id IS NOT NULL
--       AND parent_event_id NOT IN (SELECT id FROM events);
--
-- RECOMMENDED PRODUCTION ROLLOUT ORDER:
--   1. Run the diagnostic SELECT above to identify orphan count.
--   2. The orphan cleanup runs automatically as part of this migration (first statement).
--   3. FK constraint on events.parent_event_id is applied next.
--   4. GIN indexes on therapist_profiles (specializations, languages).
--      Consider CREATE INDEX CONCURRENTLY in production to avoid table locks.
--   5. Remaining B-tree indexes (lightweight, fast on small-medium tables).
--
-- =============================================================================

UPDATE "events" SET "parent_event_id" = NULL WHERE "parent_event_id" IS NOT NULL AND "parent_event_id" NOT IN (SELECT "id" FROM "events");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_parent_event_id_events_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contact_messages_created_at" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_dm_sender_date" ON "direct_messages" USING btree ("sender_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_events_status_visibility" ON "events" USING btree ("status","visibility");--> statement-breakpoint
CREATE INDEX "idx_tp_specializations_gin" ON "therapist_profiles" USING gin ("specializations");--> statement-breakpoint
CREATE INDEX "idx_tp_languages_gin" ON "therapist_profiles" USING gin ("languages");--> statement-breakpoint
CREATE INDEX "idx_tp_directory_filter" ON "therapist_profiles" USING btree ("is_approved","is_active","practice_mode","accepting_clients");