ALTER TABLE client ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE contact ADD COLUMN first_name text;
ALTER TABLE contact ADD COLUMN last_name text;
ALTER TABLE contact ADD COLUMN position text;
