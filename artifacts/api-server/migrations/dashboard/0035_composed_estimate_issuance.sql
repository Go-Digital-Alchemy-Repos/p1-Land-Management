-- The accepted preparation snapshot owns document party labels. Issuance must
-- still validate that the live operational property belongs to that client.
CREATE FUNCTION capture_composed_estimate_party() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE party record; prepared jsonb;
BEGIN
 IF NEW.kind='composed' AND OLD.status='draft' AND NEW.status='sent' THEN
  prepared=NEW.composition_snapshot->'party';
  SELECT p.client_id,p.lifecycle,p.archived AS property_archived,c.archived AS client_archived
   INTO party FROM property p JOIN client c ON c.id=p.client_id WHERE p.id=NEW.property_id FOR SHARE OF p,c;
  IF NOT FOUND OR party.lifecycle<>'operational' OR party.property_archived OR party.client_archived
   OR party.client_id::text IS DISTINCT FROM prepared->>'clientId' THEN
   RAISE EXCEPTION 'Prepared proposal client or property eligibility changed' USING ERRCODE='23514';
  END IF;
  IF NEW.document_snapshot IS NULL THEN
   RAISE EXCEPTION 'Composed issuance requires the document snapshot' USING ERRCODE='23514';
  END IF;
  NEW.document_snapshot=jsonb_set(NEW.document_snapshot,'{document}',NEW.document_snapshot->'document' || jsonb_build_object(
   'client_id',party.client_id,
   'client_name',prepared->'client.name',
   'billing_address',prepared->'client.billing_address',
   'property_name',prepared->'property.name',
   'address',prepared->'property.address'
  ));
 END IF;
 RETURN NEW;
END $$;
-- Runs after standard document capture and allocation capture.
CREATE TRIGGER zzz_composed_estimate_party BEFORE UPDATE ON estimate
 FOR EACH ROW EXECUTE FUNCTION capture_composed_estimate_party();
