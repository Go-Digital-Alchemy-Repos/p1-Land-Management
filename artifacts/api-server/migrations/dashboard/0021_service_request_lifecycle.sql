-- Keep legacy request descriptions and statuses intact.  The NOT VALID
-- constraint governs new writes without rejecting already-recorded history.
ALTER TABLE service_request
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE service_request
  ADD CONSTRAINT service_request_status_check
  CHECK(status = ANY(ARRAY['new','triaged','scheduled','converted','closed','cancelled'])) NOT VALID;

CREATE INDEX service_request_property_status_created_idx
  ON service_request(property_id, status, created_at DESC);

CREATE TABLE service_request_event (
  id uuid PRIMARY KEY,
  service_request_id uuid NOT NULL REFERENCES service_request(id),
  actor_id text NOT NULL REFERENCES "user"(id),
  event_type text NOT NULL CHECK(event_type = ANY(ARRAY['created','transitioned','converted'])),
  prior_version integer,
  resulting_version integer NOT NULL CHECK(resulting_version > 0),
  from_status text,
  to_status text,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX service_request_event_request_created_idx
  ON service_request_event(service_request_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_service_request_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Service request events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_request_event_append_only
BEFORE UPDATE OR DELETE ON service_request_event
FOR EACH ROW EXECUTE FUNCTION prevent_service_request_event_mutation();

CREATE TABLE service_request_conversion (
  operation_id uuid PRIMARY KEY,
  service_request_id uuid NOT NULL UNIQUE REFERENCES service_request(id),
  work_order_id uuid NOT NULL UNIQUE REFERENCES work_order(id),
  actor_id text NOT NULL REFERENCES "user"(id),
  expected_request_version integer NOT NULL CHECK(expected_request_version > 0),
  fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX service_request_conversion_request_created_idx
  ON service_request_conversion(service_request_id, created_at DESC);
