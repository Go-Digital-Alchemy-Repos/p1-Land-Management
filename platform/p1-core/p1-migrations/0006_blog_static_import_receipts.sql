CREATE TABLE blog_static_import_receipts (
 source_slug text PRIMARY KEY, post_id text NOT NULL, receipt_id text NOT NULL,
 imported_revision_id text NOT NULL, bundle_sha256 text NOT NULL, editorial_sha256 text NOT NULL,
 actor_id text NOT NULL, imported_at timestamptz NOT NULL DEFAULT now(), source_manifest jsonb NOT NULL,
 CONSTRAINT blog_static_receipt_post_unique UNIQUE(post_id),
 CONSTRAINT blog_static_receipt_id_unique UNIQUE(receipt_id),
 CONSTRAINT blog_static_receipt_post_fk FOREIGN KEY(post_id) REFERENCES blog_publication_state(post_id) DEFERRABLE INITIALLY DEFERRED,
 CONSTRAINT blog_static_receipt_revision_fk FOREIGN KEY(post_id,imported_revision_id) REFERENCES blog_post_revisions(post_id,id) DEFERRABLE INITIALLY DEFERRED,
 CONSTRAINT blog_static_receipt_slug_check CHECK(source_slug IN ('land-clearing-cost-per-acre-south-carolina','how-to-manage-retention-pond-south-carolina','best-grass-large-acreage-carolinas','signs-property-drainage-problem','preparing-land-agricultural-use-carolinas')),
 CONSTRAINT blog_static_receipt_hash_check CHECK(bundle_sha256 ~ '^[0-9a-f]{64}$' AND editorial_sha256 ~ '^[0-9a-f]{64}$'),
 CONSTRAINT blog_static_receipt_identity_check CHECK(length(trim(actor_id))>0 AND length(trim(receipt_id))>0),
 CONSTRAINT blog_static_receipt_manifest_check CHECK(jsonb_typeof(source_manifest)='object' AND source_manifest<>'{}'::jsonb)
);
--> statement-breakpoint
CREATE FUNCTION reject_blog_static_receipt_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Blog static import receipts are immutable'; END;
$$;
--> statement-breakpoint
CREATE TRIGGER blog_static_receipt_immutable BEFORE UPDATE OR DELETE ON blog_static_import_receipts FOR EACH ROW EXECUTE FUNCTION reject_blog_static_receipt_mutation();
