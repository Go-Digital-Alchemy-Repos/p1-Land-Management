ALTER TABLE agreement_composition_draft ADD COLUMN change_order_estimate_id uuid REFERENCES estimate(id);
ALTER TABLE agreement_composition_draft ADD CONSTRAINT agreement_draft_change_order_source CHECK(
 change_order_estimate_id IS NULL OR COALESCE((source_estimate_id=change_order_estimate_id AND revises_estimate_id IS NULL),false)
);
CREATE INDEX agreement_draft_change_order_source_idx ON agreement_composition_draft(change_order_estimate_id);
