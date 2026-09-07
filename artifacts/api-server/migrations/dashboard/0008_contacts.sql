ALTER TABLE contact ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE contact ADD COLUMN version integer NOT NULL DEFAULT 1;
CREATE INDEX contact_client_active_idx ON contact(client_id) WHERE archived=false;
