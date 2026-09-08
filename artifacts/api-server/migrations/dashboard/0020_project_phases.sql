CREATE TABLE project_phase (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES project(id),
  position integer NOT NULL CHECK(position >= 0),
  title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 500),
  scope text NOT NULL DEFAULT '' CHECK(length(scope) <= 10000),
  status text NOT NULL DEFAULT 'planned' CHECK(status = ANY(ARRAY['planned','ready','in_progress','manager_review','accepted','blocked','cancelled','archived'])),
  planned_start date,
  planned_end date,
  actual_start date,
  actual_end date,
  prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  override_reason text,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  published_summary text,
  published_at timestamptz,
  published_by text REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, position)
);

CREATE INDEX project_phase_project_position_idx ON project_phase(project_id, position);
CREATE INDEX project_phase_project_status_idx ON project_phase(project_id, status);

CREATE TABLE project_phase_event (
  id uuid PRIMARY KEY,
  phase_id uuid NOT NULL REFERENCES project_phase(id),
  actor_id text NOT NULL REFERENCES "user"(id),
  event_type text NOT NULL CHECK(event_type = ANY(ARRAY['created','updated','transitioned','published','billing_intent_created'])),
  prior_version integer,
  resulting_version integer NOT NULL CHECK(resulting_version > 0),
  from_status text,
  to_status text,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_phase_event_phase_created_idx ON project_phase_event(phase_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_project_phase_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Project phase events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_phase_event_append_only
BEFORE UPDATE OR DELETE ON project_phase_event
FOR EACH ROW EXECUTE FUNCTION prevent_project_phase_event_mutation();

ALTER TABLE work_order ADD COLUMN project_phase_id uuid REFERENCES project_phase(id);
CREATE INDEX work_order_project_phase_id_idx ON work_order(project_phase_id) WHERE project_phase_id IS NOT NULL;

CREATE TABLE project_phase_billing_intent (
  operation_id uuid PRIMARY KEY,
  phase_id uuid NOT NULL REFERENCES project_phase(id),
  billing_draft_id uuid NOT NULL UNIQUE REFERENCES billing_draft(id),
  actor_id text NOT NULL REFERENCES "user"(id),
  expected_phase_version integer NOT NULL CHECK(expected_phase_version > 0),
  fingerprint text NOT NULL,
  kind text NOT NULL CHECK(kind = ANY(ARRAY['deposit','progress','final'])),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_phase_billing_intent_phase_created_idx ON project_phase_billing_intent(phase_id, created_at DESC);
