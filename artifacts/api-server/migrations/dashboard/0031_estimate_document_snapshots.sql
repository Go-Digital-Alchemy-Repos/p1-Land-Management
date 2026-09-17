-- Existing issued records deliberately stay NULL: current party names cannot
-- reconstruct what was shown historically. Reconcile these before retirement.
ALTER TABLE estimate ADD COLUMN document_snapshot jsonb;
ALTER TABLE estimate ADD CONSTRAINT estimate_document_snapshot_object CHECK (
 document_snapshot IS NULL OR COALESCE((jsonb_typeof(document_snapshot)='object' AND document_snapshot->>'schemaVersion'='1' AND jsonb_typeof(document_snapshot->'document')='object'),false)
);

CREATE FUNCTION protect_estimate_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE party record; lines jsonb;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.document_snapshot IS NOT NULL THEN RAISE EXCEPTION 'Issued estimate documents cannot be deleted' USING ERRCODE='23514'; END IF;
  RETURN OLD;
 END IF;
 IF OLD.document_snapshot IS NOT NULL THEN
  IF NEW.status='draft' THEN RAISE EXCEPTION 'Issued estimates require a new draft revision' USING ERRCODE='23514'; END IF;
  IF NEW.document_snapshot IS DISTINCT FROM OLD.document_snapshot OR
   ROW(NEW.id,NEW.property_id,NEW.title,NEW.revision,NEW.amount_cents,NEW.scope,NEW.kind,NEW.terms,NEW.expires_at,NEW.recurring_config,NEW.agreement_template_id,NEW.agreement_template_version,NEW.agreement_template_snapshot,NEW.request_id,NEW.project_id,NEW.created_by,NEW.created_at,NEW.series_id,NEW.change_order_for)
   IS DISTINCT FROM
   ROW(OLD.id,OLD.property_id,OLD.title,OLD.revision,OLD.amount_cents,OLD.scope,OLD.kind,OLD.terms,OLD.expires_at,OLD.recurring_config,OLD.agreement_template_id,OLD.agreement_template_version,OLD.agreement_template_snapshot,OLD.request_id,OLD.project_id,OLD.created_by,OLD.created_at,OLD.series_id,OLD.change_order_for)
  THEN RAISE EXCEPTION 'Issued estimate content is immutable; create a revision' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.document_snapshot IS NOT NULL THEN RAISE EXCEPTION 'Document snapshots are created by the send transition' USING ERRCODE='23514'; END IF;
 IF OLD.status='draft' AND NEW.status='sent' THEN
  SELECT p.name AS property_name,p.address,p.client_id,c.name AS client_name,c.billing_address
   INTO party FROM property p JOIN client c ON c.id=p.client_id WHERE p.id=NEW.property_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Estimate property has no client context' USING ERRCODE='23514'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('description',description,'unit',unit,'quantity',quantity::text,'unit_price_cents',unit_price_cents::text,'position',position) ORDER BY position),'[]'::jsonb)
   INTO lines FROM estimate_line_item WHERE estimate_id=NEW.id;
  NEW.document_snapshot=jsonb_build_object('schemaVersion',1,'capturedAt',clock_timestamp(),'document',jsonb_build_object(
   'id',NEW.id,'property_id',NEW.property_id,'client_id',party.client_id,'title',NEW.title,'revision',NEW.revision,
   'property_name',party.property_name,'address',party.address,'client_name',party.client_name,'billing_address',party.billing_address,
   'scope',NEW.scope,'terms',NEW.terms,'kind',NEW.kind,'amount_cents',NEW.amount_cents::text,
   'agreement_template_snapshot',NEW.agreement_template_snapshot,'agreement_template_id',NEW.agreement_template_id,'agreement_template_version',NEW.agreement_template_version,
   'recurring_config',NEW.recurring_config,'expires_at',to_char(NEW.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'line_items',lines
  ));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER estimate_document_protection BEFORE UPDATE OR DELETE ON estimate FOR EACH ROW EXECUTE FUNCTION protect_estimate_document();

-- Serialize line writes with the estimate row held during send. Otherwise an
-- insertion/update could commit after the issued snapshot was captured.
CREATE FUNCTION protect_estimate_document_lines() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent record; old_id uuid; new_id uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN old_id=OLD.estimate_id; END IF;
 IF TG_OP<>'DELETE' THEN new_id=NEW.estimate_id; END IF;
 FOR parent IN SELECT id,document_snapshot FROM estimate WHERE id=old_id OR id=new_id ORDER BY id FOR UPDATE LOOP
  IF parent.document_snapshot IS NOT NULL THEN RAISE EXCEPTION 'Issued estimate line items are immutable; create a revision' USING ERRCODE='23514'; END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER estimate_document_line_protection BEFORE INSERT OR UPDATE OR DELETE ON estimate_line_item FOR EACH ROW EXECUTE FUNCTION protect_estimate_document_lines();
