-- One native follow-up model, with distinct inquiry/customer access at the service boundary.
CREATE TABLE crm_task (
  id uuid PRIMARY KEY,
  lead_id uuid REFERENCES lead(id),
  client_id uuid REFERENCES client(id),
  title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 2000),
  due_at timestamptz,
  completed boolean NOT NULL DEFAULT false,
  assigned_to_id text REFERENCES "user"(id),
  created_by_id text REFERENCES "user"(id),
  changed_by_id text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  creation_payload jsonb,
  source_instance_id text,
  source_task_id text,
  source_created_by_id text,
  source_assigned_to_id text,
  CHECK(num_nonnulls(lead_id,client_id)=1),
  CONSTRAINT crm_task_origin CHECK(
    (source_instance_id IS NULL AND source_task_id IS NULL AND source_created_by_id IS NULL AND source_assigned_to_id IS NULL AND created_by_id IS NOT NULL AND changed_by_id IS NOT NULL AND creation_payload IS NOT NULL)
    OR (source_instance_id IS NOT NULL AND length(btrim(source_instance_id))>0 AND source_task_id IS NOT NULL AND length(btrim(source_task_id))>0)
  )
);
CREATE UNIQUE INDEX crm_task_source_lead_idx ON crm_task(source_instance_id,source_task_id) WHERE lead_id IS NOT NULL;
CREATE UNIQUE INDEX crm_task_source_client_idx ON crm_task(source_instance_id,source_task_id) WHERE client_id IS NOT NULL;
CREATE INDEX crm_task_lead_history_idx ON crm_task(lead_id,created_at DESC,id DESC);
CREATE INDEX crm_task_client_history_idx ON crm_task(client_id,created_at DESC,id DESC);
CREATE TABLE crm_task_revision (
  task_id uuid NOT NULL REFERENCES crm_task(id),
  version integer NOT NULL,
  title text NOT NULL,
  due_at timestamptz,
  completed boolean NOT NULL,
  assigned_to_id text REFERENCES "user"(id),
  changed_by_id text REFERENCES "user"(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(task_id,version)
);
CREATE FUNCTION preserve_crm_task_history() RETURNS trigger AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'CRM task history cannot be deleted'; END IF;
  IF TG_OP='UPDATE' THEN
    IF ROW(NEW.id,NEW.lead_id,NEW.client_id,NEW.created_by_id,NEW.created_at,NEW.creation_payload,NEW.source_instance_id,NEW.source_task_id,NEW.source_created_by_id,NEW.source_assigned_to_id)
      IS DISTINCT FROM ROW(OLD.id,OLD.lead_id,OLD.client_id,OLD.created_by_id,OLD.created_at,OLD.creation_payload,OLD.source_instance_id,OLD.source_task_id,OLD.source_created_by_id,OLD.source_assigned_to_id)
      THEN RAISE EXCEPTION 'CRM task origin is immutable'; END IF;
    IF NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'CRM task version must advance by one'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER crm_task_preserve BEFORE UPDATE OR DELETE ON crm_task FOR EACH ROW EXECUTE FUNCTION preserve_crm_task_history();
CREATE FUNCTION record_crm_task_revision() RETURNS trigger AS $$
BEGIN
  INSERT INTO crm_task_revision(task_id,version,title,due_at,completed,assigned_to_id,changed_by_id)
    VALUES(NEW.id,NEW.version,NEW.title,NEW.due_at,NEW.completed,NEW.assigned_to_id,NEW.changed_by_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER crm_task_record AFTER INSERT OR UPDATE ON crm_task FOR EACH ROW EXECUTE FUNCTION record_crm_task_revision();
CREATE FUNCTION prevent_crm_task_revision_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'CRM task revisions are append-only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER crm_task_revision_preserve BEFORE UPDATE OR DELETE ON crm_task_revision FOR EACH ROW EXECUTE FUNCTION prevent_crm_task_revision_mutation();
