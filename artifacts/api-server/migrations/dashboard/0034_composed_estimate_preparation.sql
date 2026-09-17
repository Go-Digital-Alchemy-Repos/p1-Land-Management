ALTER TABLE estimate ADD COLUMN composition_snapshot jsonb;
ALTER TABLE estimate DROP CONSTRAINT estimate_kind_check;
ALTER TABLE estimate ADD CONSTRAINT estimate_kind_check CHECK(kind IN ('one_time','recurring','composed'));
ALTER TABLE estimate DROP CONSTRAINT estimate_recurring_config_check;
ALTER TABLE estimate ADD CONSTRAINT estimate_recurring_config_check CHECK(
 (kind IN ('one_time','composed') AND recurring_config IS NULL)
 OR (kind='recurring' AND recurring_config IS NOT NULL AND agreement_template_id IS NOT NULL
     AND agreement_template_version IS NOT NULL AND agreement_template_snapshot IS NOT NULL)
);
ALTER TABLE estimate ADD CONSTRAINT estimate_composition_snapshot_shape CHECK(
 composition_snapshot IS NULL OR COALESCE(kind='composed' AND jsonb_typeof(composition_snapshot)='object'
   AND composition_snapshot->'schemaVersion'='1'::jsonb AND jsonb_typeof(composition_snapshot->'content')='object'
   AND jsonb_typeof(composition_snapshot->'party')='object',false)
);
ALTER TABLE estimate_line_item ADD COLUMN billing_basis text CHECK(billing_basis IN ('one_time','fixed_monthly','per_visit'));
ALTER TABLE estimate_line_item ADD COLUMN source_row_id uuid;
ALTER TABLE estimate_line_item ADD COLUMN estimate_allocation_id uuid;
ALTER TABLE estimate_line_item ADD CONSTRAINT estimate_line_item_allocation_parent FOREIGN KEY(estimate_allocation_id,estimate_id) REFERENCES estimate_allocation(id,estimate_id);
ALTER TABLE agreement_composition_draft ADD COLUMN preparation_fingerprint text CHECK(preparation_fingerprint IS NULL OR length(preparation_fingerprint)=64);

-- Prepared estimates are assembled once inside one transaction, then sealed.
-- Changes require a new draft revision instead of mutating issued pricing or prose.
CREATE FUNCTION protect_composed_estimate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.composition_snapshot IS NOT NULL THEN RAISE EXCEPTION 'Prepared composed estimates require a new draft revision' USING ERRCODE='23514'; END IF;
  RETURN OLD;
 END IF;
 IF OLD.composition_snapshot IS NOT NULL AND
  ROW(NEW.id,NEW.property_id,NEW.title,NEW.scope,NEW.amount_cents,NEW.kind,NEW.terms,NEW.expires_at,NEW.recurring_config,
      NEW.agreement_template_id,NEW.agreement_template_version,NEW.agreement_template_snapshot,NEW.request_id,NEW.project_id,
      NEW.created_by,NEW.created_at,NEW.revision,NEW.series_id,NEW.change_order_for,NEW.composition_snapshot)
  IS DISTINCT FROM
  ROW(OLD.id,OLD.property_id,OLD.title,OLD.scope,OLD.amount_cents,OLD.kind,OLD.terms,OLD.expires_at,OLD.recurring_config,
      OLD.agreement_template_id,OLD.agreement_template_version,OLD.agreement_template_snapshot,OLD.request_id,OLD.project_id,
      OLD.created_by,OLD.created_at,OLD.revision,OLD.series_id,OLD.change_order_for,OLD.composition_snapshot)
 THEN RAISE EXCEPTION 'Prepared composed estimate content is immutable; create a revision' USING ERRCODE='23514'; END IF;
 IF NEW.kind='composed' AND NEW.status<>'draft' AND NEW.composition_snapshot IS NULL THEN
  RAISE EXCEPTION 'Composed estimate preparation is incomplete' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER composed_estimate_protection BEFORE UPDATE OR DELETE ON estimate FOR EACH ROW EXECUTE FUNCTION protect_composed_estimate();

CREATE FUNCTION check_composed_estimate_seal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_estimate record;
BEGIN
 SELECT kind,composition_snapshot,amount_cents INTO current_estimate FROM estimate WHERE id=NEW.id;
 IF FOUND AND current_estimate.kind='composed' AND current_estimate.composition_snapshot IS NULL THEN
  RAISE EXCEPTION 'A composed estimate must be completely prepared in one transaction' USING ERRCODE='23514';
 END IF;
 IF FOUND AND current_estimate.kind='composed' THEN
  IF NOT EXISTS(SELECT 1 FROM estimate_allocation WHERE estimate_id=NEW.id)
   OR (SELECT sum(amount_cents) FROM estimate_allocation WHERE estimate_id=NEW.id) IS DISTINCT FROM current_estimate.amount_cents THEN
   RAISE EXCEPTION 'Composed allocation limits must reconcile with the proposal' USING ERRCODE='23514';
  END IF;
  IF EXISTS(
   SELECT 1 FROM estimate_allocation a WHERE a.estimate_id=NEW.id AND (
    cardinality(a.cost_row_ids)<>(SELECT count(*) FROM estimate_line_item l WHERE l.estimate_allocation_id=a.id)
    OR EXISTS(SELECT 1 FROM unnest(a.cost_row_ids) AS source_id WHERE
      (SELECT count(*) FROM estimate_line_item l WHERE l.estimate_allocation_id=a.id AND l.source_row_id=source_id)<>1)
   )
  ) THEN RAISE EXCEPTION 'Composed allocations require exactly their reviewed cost rows' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER composed_estimate_seal AFTER INSERT OR UPDATE ON estimate DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION check_composed_estimate_seal();

CREATE OR REPLACE FUNCTION protect_estimate_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent record; old_id uuid; new_id uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN old_id=OLD.estimate_id; END IF;
 IF TG_OP<>'DELETE' THEN new_id=NEW.estimate_id; END IF;
 FOR parent IN SELECT id,status,document_snapshot,composition_snapshot FROM estimate WHERE id=old_id OR id=new_id ORDER BY id FOR UPDATE LOOP
  IF parent.status<>'draft' OR parent.document_snapshot IS NOT NULL OR parent.composition_snapshot IS NOT NULL THEN
   RAISE EXCEPTION 'Prepared estimate allocations are immutable; create a revision' USING ERRCODE='23514';
  END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE OR REPLACE FUNCTION protect_estimate_document_lines() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent record; old_id uuid; new_id uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN old_id=OLD.estimate_id; END IF;
 IF TG_OP<>'DELETE' THEN new_id=NEW.estimate_id; END IF;
 FOR parent IN SELECT id,document_snapshot,composition_snapshot FROM estimate WHERE id=old_id OR id=new_id ORDER BY id FOR UPDATE LOOP
  IF parent.document_snapshot IS NOT NULL OR parent.composition_snapshot IS NOT NULL THEN
   RAISE EXCEPTION 'Prepared estimate line items are immutable; create a revision' USING ERRCODE='23514';
  END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE FUNCTION check_estimate_line_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allocation record;
BEGIN
 IF NEW.estimate_allocation_id IS NOT NULL THEN
  SELECT basis,cost_row_ids INTO allocation FROM estimate_allocation WHERE id=NEW.estimate_allocation_id AND estimate_id=NEW.estimate_id;
  IF NOT FOUND OR NEW.billing_basis IS DISTINCT FROM allocation.basis OR NEW.source_row_id IS NULL OR NOT NEW.source_row_id=ANY(allocation.cost_row_ids) THEN
   RAISE EXCEPTION 'Price line must match its approved allocation and source row' USING ERRCODE='23514';
  END IF;
 ELSIF EXISTS(SELECT 1 FROM estimate WHERE id=NEW.estimate_id AND kind='composed') THEN
  RAISE EXCEPTION 'Composed price lines require an allocation' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER estimate_line_allocation_reference BEFORE INSERT OR UPDATE ON estimate_line_item
 FOR EACH ROW EXECUTE FUNCTION check_estimate_line_allocation();
