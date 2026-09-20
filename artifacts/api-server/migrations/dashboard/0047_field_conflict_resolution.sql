-- Preserve the original field evidence; review never silently applies stale work.
CREATE TABLE field_event_resolution (
 event_id uuid PRIMARY KEY REFERENCES field_event(id),
 resolved_by text NOT NULL REFERENCES "user"(id),
 note text NOT NULL CHECK(length(note) BETWEEN 1 AND 2000),
 resolved_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION prevent_field_resolution_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Field conflict resolutions are append-only'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER field_resolution_preserve BEFORE UPDATE OR DELETE ON field_event_resolution
 FOR EACH ROW EXECUTE FUNCTION prevent_field_resolution_mutation();
