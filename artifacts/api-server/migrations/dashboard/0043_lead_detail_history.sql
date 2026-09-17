-- Baseline is the state at migration, not a claim about the original public submission.
CREATE TABLE lead_detail_revision (
 lead_id uuid NOT NULL REFERENCES lead(id),
 version integer NOT NULL CHECK(version>0),
 kind text NOT NULL CHECK(kind IN ('baseline','created','edited')),
 fields jsonb NOT NULL,
 actor_id text REFERENCES "user"(id),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(lead_id,version)
);
CREATE FUNCTION lead_detail_fields(item lead) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_build_object('name',item.name,'email',item.email,'phone',item.phone,'location',item.location,'description',item.description,'reported_company_name',item.reported_company_name)
$$;
INSERT INTO lead_detail_revision(lead_id,version,kind,fields)
 SELECT id,version,'baseline',lead_detail_fields(lead) FROM lead;
CREATE FUNCTION record_lead_detail_revision() RETURNS trigger AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF lead_detail_fields(NEW)=lead_detail_fields(OLD) THEN RETURN NEW; END IF;
  IF NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Inquiry detail version must advance by one'; END IF;
 END IF;
 INSERT INTO lead_detail_revision(lead_id,version,kind,fields,actor_id)
 VALUES(NEW.id,NEW.version,CASE WHEN TG_OP='INSERT' THEN 'created' ELSE 'edited' END,lead_detail_fields(NEW),nullif(current_setting('p1.lead_detail_actor',true),''));
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER lead_detail_record AFTER INSERT OR UPDATE ON lead FOR EACH ROW EXECUTE FUNCTION record_lead_detail_revision();
CREATE FUNCTION prevent_lead_detail_revision_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Inquiry detail revisions are append-only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER lead_detail_revision_preserve BEFORE UPDATE OR DELETE ON lead_detail_revision FOR EACH ROW EXECUTE FUNCTION prevent_lead_detail_revision_mutation();
