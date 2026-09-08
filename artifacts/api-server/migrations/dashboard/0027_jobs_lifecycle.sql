-- Jobs are the product name for work_order.  Keep the established table and
-- API compatibility while adding the estimate, recurrence and shared-project
-- relationships needed by the new workflow.
ALTER TABLE service_request
  ADD COLUMN source text NOT NULL DEFAULT 'portal' CHECK(source IN ('portal','manual')),
  ADD COLUMN requester_contact_id uuid REFERENCES contact(id);

CREATE TABLE agreement_template (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 200),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 50000),
  active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name,version)
);

ALTER TABLE estimate
  ADD COLUMN request_id uuid REFERENCES service_request(id),
  ADD COLUMN created_by text REFERENCES "user"(id),
  ADD COLUMN project_id uuid REFERENCES project(id),
  ADD COLUMN kind text NOT NULL DEFAULT 'one_time' CHECK(kind IN ('one_time','recurring')),
  ADD COLUMN terms text NOT NULL DEFAULT '',
  ADD COLUMN expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
  ADD COLUMN recurring_config jsonb,
  ADD COLUMN agreement_template_id uuid REFERENCES agreement_template(id),
  ADD COLUMN agreement_template_version integer,
  ADD COLUMN agreement_template_snapshot text;
CREATE INDEX estimate_request_idx ON estimate(request_id);
ALTER TABLE estimate ADD CONSTRAINT estimate_recurring_config_check CHECK(
  (kind='one_time' AND recurring_config IS NULL)
  OR (kind='recurring' AND recurring_config IS NOT NULL
      AND agreement_template_id IS NOT NULL
      AND agreement_template_version IS NOT NULL
      AND agreement_template_snapshot IS NOT NULL)
);

CREATE TABLE estimate_line_item (
  id uuid PRIMARY KEY,
  estimate_id uuid NOT NULL REFERENCES estimate(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK(position>=0),
  description text NOT NULL CHECK(length(btrim(description)) BETWEEN 1 AND 2000),
  unit text,
  quantity numeric(12,2) NOT NULL CHECK(quantity>0),
  unit_price_cents bigint NOT NULL CHECK(unit_price_cents>=0 AND unit_price_cents<=10000000000),
  UNIQUE(estimate_id,position)
);

CREATE TABLE estimate_recipient (
  id uuid PRIMARY KEY,
  estimate_id uuid NOT NULL REFERENCES estimate(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contact(id),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  decided_at timestamptz,
  decision text CHECK(decision IN ('approved','declined','expired','revoked')),
  UNIQUE(estimate_id,contact_id)
);
CREATE INDEX estimate_recipient_estimate_idx ON estimate_recipient(estimate_id);

CREATE TABLE contact_notification_preference (
  contact_id uuid PRIMARY KEY REFERENCES contact(id),
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  in_app_enabled boolean NOT NULL DEFAULT false,
  sms_consented_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(email_enabled OR sms_enabled OR in_app_enabled),
  CHECK(sms_enabled=false OR sms_consented_at IS NOT NULL)
);

ALTER TABLE work_order
  ADD COLUMN estimate_id uuid REFERENCES estimate(id),
  ADD COLUMN request_id uuid REFERENCES service_request(id),
  ADD COLUMN job_kind text NOT NULL DEFAULT 'one_time' CHECK(job_kind IN ('one_time','recurring_visit','internal')),
  ADD COLUMN internal_reason text;
CREATE UNIQUE INDEX work_order_estimate_once ON work_order(estimate_id) WHERE estimate_id IS NOT NULL;
ALTER TABLE work_order ADD CONSTRAINT work_order_internal_reason_check CHECK(
  (job_kind='internal' AND internal_reason IS NOT NULL AND length(btrim(internal_reason)) BETWEEN 1 AND 1000)
  OR (job_kind<>'internal' AND internal_reason IS NULL)
);

ALTER TABLE recurring_service
  ADD COLUMN estimate_id uuid REFERENCES estimate(id),
  ADD COLUMN project_id uuid REFERENCES project(id),
  ADD COLUMN agreement_id uuid;
CREATE UNIQUE INDEX recurring_service_estimate_once ON recurring_service(estimate_id) WHERE estimate_id IS NOT NULL;
ALTER TABLE service_agreement
  ADD COLUMN template_id uuid REFERENCES agreement_template(id),
  ADD COLUMN template_version integer,
  ADD COLUMN template_snapshot text,
  ADD COLUMN accepted_at timestamptz,
  ADD COLUMN accepted_by_contact_id uuid REFERENCES contact(id);
ALTER TABLE recurring_service
  ADD CONSTRAINT recurring_service_agreement_fkey FOREIGN KEY(agreement_id) REFERENCES service_agreement(id);
CREATE UNIQUE INDEX recurring_service_agreement_once ON recurring_service(agreement_id) WHERE agreement_id IS NOT NULL;

-- A Project is a staff-only portfolio container.  Existing rows retain their
-- primary property and are backfilled into additive participant tables.
ALTER TABLE project ALTER COLUMN property_id DROP NOT NULL;
CREATE TABLE project_client (
  project_id uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES client(id),
  PRIMARY KEY(project_id,client_id)
);
CREATE TABLE project_property (
  project_id uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES property(id),
  PRIMARY KEY(project_id,property_id)
);
INSERT INTO project_client(project_id,client_id)
SELECT j.id,p.client_id FROM project j JOIN property p ON p.id=j.property_id WHERE p.client_id IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO project_property(project_id,property_id)
SELECT id,property_id FROM project WHERE property_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Operational notifications belong to the account lifecycle. Removing a user
-- must not leave orphaned notifications or block account cleanup.
ALTER TABLE notification DROP CONSTRAINT notification_user_id_fkey;
ALTER TABLE notification
  ADD CONSTRAINT notification_user_id_fkey
  FOREIGN KEY(user_id) REFERENCES "user"(id) ON DELETE CASCADE;
