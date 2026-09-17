-- Extend the existing note store; do not duplicate customer history in a CRM table.
ALTER TABLE client_note ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE client_note ADD COLUMN source_instance_id text;
ALTER TABLE client_note ADD COLUMN source_note_id text;
ALTER TABLE client_note ADD COLUMN source_author_id text;
ALTER TABLE client_note ADD CONSTRAINT client_note_origin CHECK (
  (source_instance_id IS NULL AND source_note_id IS NULL AND source_author_id IS NULL AND author_id IS NOT NULL)
  OR (source_instance_id IS NOT NULL AND length(btrim(source_instance_id))>0 AND source_note_id IS NOT NULL AND length(btrim(source_note_id))>0)
);
CREATE UNIQUE INDEX client_note_source_idx ON client_note(source_instance_id,source_note_id);
CREATE INDEX client_note_history_idx ON client_note(client_id,created_at DESC,id DESC);
-- Existing append-only trigger and foreign keys remain in force.
