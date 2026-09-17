-- One customer-facing authorization, with separate operational spending limits.
-- No historical estimates are assigned invented allocations.
CREATE TABLE estimate_allocation (
 id uuid PRIMARY KEY,
 estimate_id uuid NOT NULL REFERENCES estimate(id),
 basis text NOT NULL CHECK(basis IN ('one_time','fixed_monthly','per_visit')),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 500),
 scope text NOT NULL CHECK(length(btrim(scope))>0),
 amount_cents bigint NOT NULL CHECK(amount_cents>0 AND amount_cents<=10000000000),
 scope_row_ids uuid[] NOT NULL CHECK(cardinality(scope_row_ids)>0),
 cost_row_ids uuid[] NOT NULL CHECK(cardinality(cost_row_ids)>0),
 configuration jsonb,
 UNIQUE(estimate_id,basis),
 UNIQUE(id,estimate_id),
 CHECK((basis='one_time' AND configuration IS NULL) OR
       (basis<>'one_time' AND COALESCE(jsonb_typeof(configuration)='object',false)))
);

ALTER TABLE work_order ADD COLUMN estimate_allocation_id uuid;
ALTER TABLE recurring_service ADD COLUMN estimate_allocation_id uuid;
ALTER TABLE service_agreement ADD COLUMN estimate_allocation_id uuid;
ALTER TABLE billing_draft ADD COLUMN estimate_allocation_id uuid;
ALTER TABLE work_order ADD CONSTRAINT work_order_allocation_parent FOREIGN KEY(estimate_allocation_id,estimate_id) REFERENCES estimate_allocation(id,estimate_id);
ALTER TABLE recurring_service ADD CONSTRAINT recurring_service_allocation_parent FOREIGN KEY(estimate_allocation_id,estimate_id) REFERENCES estimate_allocation(id,estimate_id);
ALTER TABLE service_agreement ADD CONSTRAINT service_agreement_allocation_parent FOREIGN KEY(estimate_allocation_id,estimate_id) REFERENCES estimate_allocation(id,estimate_id);
ALTER TABLE billing_draft ADD CONSTRAINT billing_draft_allocation_parent FOREIGN KEY(estimate_allocation_id,estimate_id) REFERENCES estimate_allocation(id,estimate_id);
ALTER TABLE work_order ADD CONSTRAINT work_order_allocation_estimate CHECK(estimate_allocation_id IS NULL OR estimate_id IS NOT NULL);
ALTER TABLE recurring_service ADD CONSTRAINT recurring_service_allocation_estimate CHECK(estimate_allocation_id IS NULL OR estimate_id IS NOT NULL);
ALTER TABLE billing_draft ADD CONSTRAINT billing_draft_allocation_estimate CHECK(estimate_allocation_id IS NULL OR estimate_id IS NOT NULL);

-- Retain legacy one-recurrence semantics; an allocated estimate can have one
-- recurrence per explicitly authorized component. One-time work remains unique.
DROP INDEX recurring_service_estimate_once;
CREATE UNIQUE INDEX recurring_service_estimate_once ON recurring_service(estimate_id)
 WHERE estimate_id IS NOT NULL AND estimate_allocation_id IS NULL;
CREATE UNIQUE INDEX recurring_service_allocation_once ON recurring_service(estimate_allocation_id)
 WHERE estimate_allocation_id IS NOT NULL;
CREATE INDEX billing_draft_allocation_total ON billing_draft(estimate_id,estimate_allocation_id);

CREATE FUNCTION protect_estimate_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent record; old_id uuid; new_id uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN old_id=OLD.estimate_id; END IF;
 IF TG_OP<>'DELETE' THEN new_id=NEW.estimate_id; END IF;
 FOR parent IN SELECT id,status,document_snapshot FROM estimate WHERE id=old_id OR id=new_id ORDER BY id FOR UPDATE LOOP
  IF parent.status<>'draft' OR parent.document_snapshot IS NOT NULL THEN
   RAISE EXCEPTION 'Issued estimate allocations are immutable; create a revision' USING ERRCODE='23514';
  END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER estimate_allocation_protection BEFORE INSERT OR UPDATE OR DELETE ON estimate_allocation
 FOR EACH ROW EXECUTE FUNCTION protect_estimate_allocation();

-- Runs after estimate_document_protection, appending the exact issued allocation
-- rows to that same immutable document snapshot. All changes roll back together.
CREATE FUNCTION capture_estimate_allocations() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total numeric; allocations jsonb;
BEGIN
 IF OLD.status='draft' AND NEW.status<>'draft' THEN
  SELECT sum(amount_cents),jsonb_agg(jsonb_build_object(
    'id',id,'basis',basis,'title',title,'scope',scope,'amount_cents',amount_cents::text,
    'scope_row_ids',scope_row_ids,'cost_row_ids',cost_row_ids,'configuration',configuration
   ) ORDER BY basis,id) INTO total,allocations FROM estimate_allocation WHERE estimate_id=NEW.id;
  IF allocations IS NOT NULL THEN
   IF NEW.status<>'sent' OR NEW.document_snapshot IS NULL THEN
    RAISE EXCEPTION 'Allocated estimates must be issued before a decision' USING ERRCODE='23514';
   END IF;
   IF total<>NEW.amount_cents THEN
    RAISE EXCEPTION 'Estimate amount must equal its authorized allocations' USING ERRCODE='23514';
   END IF;
   NEW.document_snapshot=jsonb_set(NEW.document_snapshot,'{document,allocations}',allocations);
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_estimate_allocation_snapshot BEFORE UPDATE ON estimate
 FOR EACH ROW EXECUTE FUNCTION capture_estimate_allocations();

CREATE FUNCTION enforce_estimate_allocation_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allocation record; parent record;
BEGIN
 IF TG_OP='UPDATE' AND OLD.estimate_allocation_id IS NOT NULL AND
   ROW(NEW.estimate_id,NEW.estimate_allocation_id) IS DISTINCT FROM ROW(OLD.estimate_id,OLD.estimate_allocation_id) THEN
  RAISE EXCEPTION 'Allocated operational records cannot change authorization' USING ERRCODE='23514';
 END IF;
 IF NEW.estimate_id IS NULL THEN RETURN NEW; END IF;
 SELECT id,property_id,status INTO parent FROM estimate WHERE id=NEW.estimate_id FOR UPDATE;
 IF NEW.estimate_allocation_id IS NULL THEN
  IF EXISTS(SELECT 1 FROM estimate_allocation WHERE estimate_id=NEW.estimate_id) THEN
   RAISE EXCEPTION 'Choose an authorized estimate allocation' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO allocation FROM estimate_allocation WHERE id=NEW.estimate_allocation_id AND estimate_id=NEW.estimate_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Allocation does not belong to this estimate' USING ERRCODE='23514'; END IF;
 IF NEW.property_id<>parent.property_id OR parent.status<>'approved' THEN
  RAISE EXCEPTION 'Allocation requires approved authorization for this property' USING ERRCODE='23514';
 END IF;
 IF TG_TABLE_NAME='work_order' THEN
  IF allocation.basis<>'one_time' THEN RAISE EXCEPTION 'One-time work requires a one-time allocation' USING ERRCODE='23514'; END IF;
 ELSE
  IF allocation.basis='one_time' OR NEW.billing_mode<>allocation.basis THEN
   RAISE EXCEPTION 'Recurrence billing must match its allocation' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER work_order_allocation_reference BEFORE INSERT OR UPDATE OF estimate_id,estimate_allocation_id,property_id ON work_order
 FOR EACH ROW EXECUTE FUNCTION enforce_estimate_allocation_reference();
CREATE TRIGGER recurring_service_allocation_reference BEFORE INSERT OR UPDATE OF estimate_id,estimate_allocation_id,billing_mode,property_id ON recurring_service
 FOR EACH ROW EXECUTE FUNCTION enforce_estimate_allocation_reference();
CREATE TRIGGER service_agreement_allocation_reference BEFORE INSERT OR UPDATE OF estimate_id,estimate_allocation_id,billing_mode,property_id ON service_agreement
 FOR EACH ROW EXECUTE FUNCTION enforce_estimate_allocation_reference();

CREATE FUNCTION enforce_allocated_billing_cap() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_estimate_id uuid; parent record; allocation record; global_billed numeric; component_billed numeric;
BEGIN
 IF TG_OP='UPDATE' THEN
  old_estimate_id=OLD.estimate_id;
  IF OLD.estimate_allocation_id IS NOT NULL AND
    ROW(NEW.estimate_id,NEW.estimate_allocation_id) IS DISTINCT FROM ROW(OLD.estimate_id,OLD.estimate_allocation_id) THEN
   RAISE EXCEPTION 'Allocated billing cannot change authorization' USING ERRCODE='23514';
  END IF;
 END IF;
 -- Match API lock order and serialize every billing writer against approval and
 -- other charges, including simultaneous charges to different components.
 FOR parent IN SELECT id FROM estimate WHERE id=old_estimate_id OR id=NEW.estimate_id ORDER BY id FOR UPDATE LOOP END LOOP;
 IF NEW.estimate_id IS NULL THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM estimate_allocation WHERE estimate_id=NEW.estimate_id) THEN
  IF NEW.estimate_allocation_id IS NOT NULL THEN RAISE EXCEPTION 'Allocation does not belong to this estimate' USING ERRCODE='23514'; END IF;
  RETURN NEW; -- Preserve existing behavior for unallocated historical estimates.
 END IF;
 SELECT * INTO parent FROM estimate WHERE id=NEW.estimate_id;
 IF NEW.property_id<>parent.property_id THEN RAISE EXCEPTION 'Billing property does not match allocation' USING ERRCODE='23514'; END IF;
 IF parent.status<>'approved' THEN RAISE EXCEPTION 'An approved estimate is required for allocated billing' USING ERRCODE='23514'; END IF;
 IF NEW.estimate_allocation_id IS NULL THEN RAISE EXCEPTION 'Choose an authorized estimate allocation' USING ERRCODE='23514'; END IF;
 SELECT * INTO allocation FROM estimate_allocation WHERE id=NEW.estimate_allocation_id AND estimate_id=NEW.estimate_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Allocation does not belong to this estimate' USING ERRCODE='23514'; END IF;
 SELECT COALESCE(sum(amount_cents),0),COALESCE(sum(amount_cents) FILTER(WHERE estimate_allocation_id=NEW.estimate_allocation_id),0)
  INTO global_billed,component_billed FROM billing_draft WHERE estimate_id=NEW.estimate_id AND id<>NEW.id;
 IF global_billed+NEW.amount_cents>parent.amount_cents THEN RAISE EXCEPTION 'Billing exceeds the approved estimate' USING ERRCODE='23514'; END IF;
 IF component_billed+NEW.amount_cents>allocation.amount_cents THEN RAISE EXCEPTION 'Billing exceeds the approved allocation' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER billing_draft_allocation_cap BEFORE INSERT OR UPDATE OF estimate_id,estimate_allocation_id,amount_cents,property_id ON billing_draft
 FOR EACH ROW EXECUTE FUNCTION enforce_allocated_billing_cap();
