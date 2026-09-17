-- Preserve reviewed CRM source rows separately from operational dashboard fields.
CREATE TABLE crm_source_record (
 source_instance_id text NOT NULL CHECK(length(btrim(source_instance_id))>0),
 source_table text NOT NULL CHECK(source_table IN ('leads','clients','leadNotes','clientNotes','leadTasks','clientTasks')),
 source_id text NOT NULL CHECK(length(btrim(source_id))>0),
 source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[a-f0-9]{64}$'),
 source_payload jsonb NOT NULL CHECK(jsonb_typeof(source_payload)='object'),
 lead_id uuid REFERENCES lead(id),
 client_id uuid REFERENCES client(id),
 native_record_id uuid,
 projection_sha256 text NOT NULL CHECK(projection_sha256 ~ '^[a-f0-9]{64}$'),
 review_sha256 text NOT NULL CHECK(review_sha256 ~ '^[a-f0-9]{64}$'),
 imported_by_id text NOT NULL REFERENCES "user"(id),
 imported_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(source_instance_id,source_table,source_id),
 CHECK(num_nonnulls(lead_id,client_id)=1),
 CHECK((source_table IN ('leads','leadNotes','leadTasks') AND lead_id IS NOT NULL) OR (source_table IN ('clients','clientNotes','clientTasks') AND client_id IS NOT NULL)),
 CHECK((source_table IN ('leads','clients') AND native_record_id IS NULL) OR (source_table NOT IN ('leads','clients') AND native_record_id IS NOT NULL))
);
CREATE UNIQUE INDEX crm_source_lead_mapping ON crm_source_record(source_instance_id,lead_id) WHERE source_table='leads';
CREATE UNIQUE INDEX crm_source_client_mapping ON crm_source_record(source_instance_id,client_id) WHERE source_table='clients';
CREATE UNIQUE INDEX crm_source_native_mapping ON crm_source_record(source_table,native_record_id) WHERE native_record_id IS NOT NULL;
CREATE FUNCTION preserve_crm_source_record() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'CRM source archive is immutable'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER crm_source_record_preserve BEFORE UPDATE OR DELETE ON crm_source_record FOR EACH ROW EXECUTE FUNCTION preserve_crm_source_record();
