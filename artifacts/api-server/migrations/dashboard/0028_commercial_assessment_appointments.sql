-- Commercial appointments reserve shared staff availability without promoting a
-- prospect property into operational scheduling or client-visible records.
ALTER TABLE assessment_slot
  ADD COLUMN commercial_assessment_id uuid REFERENCES commercial_assessment(id);
ALTER TABLE assessment_slot ADD CONSTRAINT assessment_slot_single_reservation CHECK(
  NOT (property_id IS NOT NULL AND commercial_assessment_id IS NOT NULL)
);
CREATE UNIQUE INDEX assessment_slot_commercial_assessment_once
  ON assessment_slot(commercial_assessment_id) WHERE commercial_assessment_id IS NOT NULL;

CREATE TABLE commercial_assessment_appointment (
  id uuid PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES commercial_assessment(id),
  slot_id uuid NOT NULL REFERENCES assessment_slot(id),
  property_id uuid NOT NULL REFERENCES property(id),
  status text NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_by text NOT NULL REFERENCES "user"(id),
  cancelled_by text REFERENCES "user"(id),
  cancelled_at timestamptz,
  cancellation_reason text CHECK(cancellation_reason IS NULL OR length(btrim(cancellation_reason)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK((cancelled_by IS NULL) = (cancelled_at IS NULL)),
  CHECK((cancelled_by IS NULL) = (cancellation_reason IS NULL))
);
CREATE UNIQUE INDEX commercial_assessment_appointment_confirmed_assessment_once
  ON commercial_assessment_appointment(assessment_id) WHERE status='confirmed';
CREATE UNIQUE INDEX commercial_assessment_appointment_confirmed_slot_once
  ON commercial_assessment_appointment(slot_id) WHERE status='confirmed';
CREATE INDEX commercial_assessment_appointment_property_idx
  ON commercial_assessment_appointment(property_id,created_at DESC);

CREATE TABLE commercial_assessment_appointment_operation (
  id uuid PRIMARY KEY,
  actor_id text NOT NULL REFERENCES "user"(id),
  assessment_id uuid NOT NULL REFERENCES commercial_assessment(id),
  fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
