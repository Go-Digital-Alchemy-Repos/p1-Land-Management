ALTER TABLE project
  ADD COLUMN version integer NOT NULL DEFAULT 1;

ALTER TABLE project
  ADD CONSTRAINT project_version_check CHECK(version > 0);
