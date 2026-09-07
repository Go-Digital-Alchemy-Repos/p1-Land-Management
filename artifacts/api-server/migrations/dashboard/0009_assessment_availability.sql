CREATE TABLE assessment_availability (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  version integer NOT NULL DEFAULT 1,
  duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 15 AND 240),
  buffer_before integer NOT NULL CHECK(buffer_before BETWEEN 0 AND 120),
  buffer_after integer NOT NULL CHECK(buffer_after BETWEEN 0 AND 120),
  windows jsonb NOT NULL DEFAULT '[]'
);
INSERT INTO assessment_availability(id,duration_minutes,buffer_before,buffer_after) VALUES(true,60,15,15);
CREATE TABLE assessment_blackout (
  id uuid PRIMARY KEY,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),
  reason text NOT NULL,
  archived boolean NOT NULL DEFAULT false
);
ALTER TABLE assessment_slot ADD COLUMN managed boolean NOT NULL DEFAULT false;
ALTER TABLE assessment_slot ADD COLUMN cancelled boolean NOT NULL DEFAULT false;
ALTER TABLE assessment_slot ADD COLUMN buffer_before integer NOT NULL DEFAULT 0;
ALTER TABLE assessment_slot ADD COLUMN buffer_after integer NOT NULL DEFAULT 0;
CREATE INDEX assessment_slot_available ON assessment_slot(starts_at) WHERE property_id IS NULL AND cancelled=false;
