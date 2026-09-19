ALTER TABLE blog_post_revisions DROP CONSTRAINT blog_post_revisions_action_check;
--> statement-breakpoint
ALTER TABLE blog_post_revisions ADD CONSTRAINT blog_post_revisions_action_check CHECK(action IN ('initialize','save','publish','unpublish','restore','delete','schedule','cancel_schedule','scheduled_publish','schedule_failed'));
--> statement-breakpoint
CREATE TABLE blog_publication_schedules (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, post_id text NOT NULL, revision_id text NOT NULL,
 scheduled_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'pending', created_version integer NOT NULL,
 actor_id text NOT NULL, failure_code text, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 CONSTRAINT blog_schedule_post_fk FOREIGN KEY(post_id) REFERENCES blog_publication_state(post_id) DEFERRABLE INITIALLY DEFERRED,
 CONSTRAINT blog_schedule_revision_fk FOREIGN KEY(post_id,revision_id) REFERENCES blog_post_revisions(post_id,id) DEFERRABLE INITIALLY DEFERRED,
 CONSTRAINT blog_schedule_status_check CHECK(status IN ('pending','published','cancelled','failed')),
 CONSTRAINT blog_schedule_version_check CHECK(created_version>0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX blog_schedule_one_pending ON blog_publication_schedules(post_id) WHERE status='pending';
