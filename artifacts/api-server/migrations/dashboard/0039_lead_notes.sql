-- Native Sales history; nullable historical authors require durable source provenance.
CREATE TABLE lead_note (
  id uuid PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES lead(id),
  author_id text REFERENCES "user"(id),
  body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  source_instance_id text,
  source_note_id text,
  source_author_id text,
  CONSTRAINT lead_note_origin CHECK (
    (source_instance_id IS NULL AND source_note_id IS NULL AND source_author_id IS NULL AND author_id IS NOT NULL)
    OR (length(btrim(source_instance_id)) > 0 AND source_instance_id IS NOT NULL
        AND length(btrim(source_note_id)) > 0 AND source_note_id IS NOT NULL)
  ),
  UNIQUE(source_instance_id, source_note_id)
);
CREATE INDEX lead_note_history_idx ON lead_note(lead_id, created_at DESC, id DESC);
CREATE FUNCTION prevent_lead_note_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Lead notes are append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER lead_note_append_only BEFORE UPDATE OR DELETE ON lead_note
FOR EACH ROW EXECUTE FUNCTION prevent_lead_note_mutation();
