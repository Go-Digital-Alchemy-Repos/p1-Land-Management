CREATE TABLE client_note (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES client(id),
  property_id uuid REFERENCES property(id),
  author_id text NOT NULL REFERENCES "user"(id),
  body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX client_note_client_created_idx ON client_note(client_id, created_at DESC);
CREATE INDEX client_note_property_created_idx ON client_note(property_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_client_note_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Client notes are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_note_append_only
BEFORE UPDATE OR DELETE ON client_note
FOR EACH ROW EXECUTE FUNCTION prevent_client_note_mutation();
