CREATE TABLE blog_publication_state (
 post_id text PRIMARY KEY, version integer NOT NULL CHECK(version>0), draft_revision_id text NOT NULL,
 published_revision_id text, last_published_revision_id text, publication_generation integer NOT NULL DEFAULT 0 CHECK(publication_generation>=0),
 visibility text NOT NULL DEFAULT 'unpublished' CHECK(visibility IN ('unpublished','published','deleted')),
 legacy_fingerprint text NOT NULL, first_published_at timestamptz, last_published_at timestamptz, withdrawn_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((visibility='published') = (published_revision_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE blog_post_revisions (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, post_id text NOT NULL REFERENCES blog_publication_state(post_id) DEFERRABLE INITIALLY DEFERRED,
 version integer NOT NULL CHECK(version>0), schema_version integer NOT NULL DEFAULT 1 CHECK(schema_version=1),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'), action text NOT NULL CHECK(action IN ('initialize','save','publish','unpublish','restore','delete')),
 actor_id text NOT NULL CHECK(length(actor_id)>0), editor_instance_id text, source_revision_id text,
 provenance jsonb NOT NULL CHECK(jsonb_typeof(provenance)='object'), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(post_id,version), UNIQUE(post_id,id)
);
--> statement-breakpoint
ALTER TABLE blog_publication_state ADD CONSTRAINT blog_draft_pointer FOREIGN KEY(post_id,draft_revision_id) REFERENCES blog_post_revisions(post_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE blog_publication_state ADD CONSTRAINT blog_published_pointer FOREIGN KEY(post_id,published_revision_id) REFERENCES blog_post_revisions(post_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE blog_publication_state ADD CONSTRAINT blog_last_published_pointer FOREIGN KEY(post_id,last_published_revision_id) REFERENCES blog_post_revisions(post_id,id) DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
CREATE TABLE blog_publication_routes (
 slug text PRIMARY KEY, post_id text NOT NULL REFERENCES blog_publication_state(post_id) DEFERRABLE INITIALLY DEFERRED, generation integer NOT NULL CHECK(generation>0),
 revision_id text, state text NOT NULL CHECK(state IN ('published','withdrawn')), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((state='published') = (revision_id IS NOT NULL)),
 FOREIGN KEY(post_id,revision_id) REFERENCES blog_post_revisions(post_id,id) DEFERRABLE INITIALLY DEFERRED
);
--> statement-breakpoint
CREATE FUNCTION reject_blog_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Blog revisions are immutable'; END;
$$;
--> statement-breakpoint
CREATE TRIGGER blog_revisions_immutable BEFORE UPDATE OR DELETE ON blog_post_revisions FOR EACH ROW EXECUTE FUNCTION reject_blog_revision_mutation();
