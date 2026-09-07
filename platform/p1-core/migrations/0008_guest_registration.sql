ALTER TABLE "event_registrations" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "reminder_sent_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_er_event_email" ON "event_registrations" USING btree ("event_id","email");