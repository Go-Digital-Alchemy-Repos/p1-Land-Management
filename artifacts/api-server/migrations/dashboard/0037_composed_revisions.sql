ALTER TABLE agreement_composition_draft ADD COLUMN revises_estimate_id uuid REFERENCES estimate(id);
ALTER TABLE agreement_composition_draft ADD COLUMN revises_estimate_revision integer;
ALTER TABLE agreement_composition_draft ADD CONSTRAINT agreement_draft_revision_source CHECK(
 (revises_estimate_id IS NULL AND revises_estimate_revision IS NULL)
 OR COALESCE((revises_estimate_id IS NOT NULL AND revises_estimate_revision>0 AND source_estimate_id=revises_estimate_id),false)
);
CREATE INDEX agreement_draft_revision_source_idx ON agreement_composition_draft(revises_estimate_id);
