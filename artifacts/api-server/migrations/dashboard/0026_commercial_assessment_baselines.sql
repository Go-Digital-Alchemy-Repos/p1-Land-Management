-- Sales assessment baselines are distinct from assessment_slot, which is an
-- operational availability calendar. They hold pre-client commercial discovery
-- records only and must never create a booking, proposal, work order, or client.
CREATE TABLE commercial_assessment (
  id uuid PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES lead(id),
  property_id uuid REFERENCES property(id),
  title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 200),
  scope_note text CHECK(scope_note IS NULL OR length(btrim(scope_note)) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reviewed','archived')),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  created_by text NOT NULL REFERENCES "user"(id),
  updated_by text NOT NULL REFERENCES "user"(id),
  reviewed_by text REFERENCES "user"(id),
  reviewed_at timestamptz,
  archived_by text REFERENCES "user"(id),
  archived_at timestamptz,
  archive_reason text CHECK(archive_reason IS NULL OR length(btrim(archive_reason)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK((reviewed_by IS NULL) = (reviewed_at IS NULL)),
  CHECK((archived_by IS NULL) = (archived_at IS NULL)),
  CHECK((archived_by IS NULL) = (archive_reason IS NULL))
);
CREATE UNIQUE INDEX commercial_assessment_one_active_per_lead
  ON commercial_assessment(lead_id) WHERE status <> 'archived';
CREATE INDEX commercial_assessment_lead_created_idx
  ON commercial_assessment(lead_id, created_at DESC);

CREATE TABLE commercial_assessment_finding (
  id uuid PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES commercial_assessment(id),
  position integer NOT NULL CHECK(position >= 0),
  category text NOT NULL CHECK(category IN ('grounds_vegetation','stormwater_drainage','grading_erosion','tree_land','roads_access','emergency_corrective','recurring_site_management','other')),
  condition_label text CHECK(condition_label IS NULL OR length(btrim(condition_label)) BETWEEN 1 AND 200),
  observation text NOT NULL CHECK(length(btrim(observation)) BETWEEN 1 AND 4000),
  priority text CHECK(priority IS NULL OR priority IN ('low','medium','high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, position),
  UNIQUE(assessment_id, id)
);

CREATE TABLE commercial_assessment_recommendation (
  id uuid PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES commercial_assessment(id),
  finding_id uuid,
  position integer NOT NULL CHECK(position >= 0),
  recommendation text NOT NULL CHECK(length(btrim(recommendation)) BETWEEN 1 AND 4000),
  priority text CHECK(priority IS NULL OR priority IN ('low','medium','high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, position),
  FOREIGN KEY(assessment_id, finding_id)
    REFERENCES commercial_assessment_finding(assessment_id, id)
);

CREATE TABLE commercial_assessment_review (
  id uuid PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES commercial_assessment(id),
  assessment_version integer NOT NULL CHECK(assessment_version > 0),
  snapshot_sha256 text NOT NULL CHECK(snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  snapshot jsonb NOT NULL,
  reviewed_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, assessment_version)
);
CREATE INDEX commercial_assessment_review_assessment_created_idx
  ON commercial_assessment_review(assessment_id, created_at DESC);

CREATE FUNCTION reject_commercial_assessment_review_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Commercial assessment reviews are append-only' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER commercial_assessment_review_append_only
  BEFORE UPDATE OR DELETE ON commercial_assessment_review
  FOR EACH ROW EXECUTE FUNCTION reject_commercial_assessment_review_mutation();

-- The stable operation key and request fingerprint make a browser retry return
-- its original receipt without duplicating an assessment or audit event.
CREATE TABLE commercial_assessment_create_operation (
  id uuid PRIMARY KEY,
  actor_id text NOT NULL REFERENCES "user"(id),
  lead_id uuid NOT NULL REFERENCES lead(id),
  fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
