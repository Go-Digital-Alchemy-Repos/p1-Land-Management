ALTER TABLE lead ALTER COLUMN email DROP NOT NULL;
ALTER TABLE lead ADD COLUMN inquiry_type text;
ALTER TABLE lead ADD COLUMN reported_company_name text;
ALTER TABLE lead ADD COLUMN contact_title text;
ALTER TABLE lead ADD COLUMN reported_property_name text;
ALTER TABLE lead ADD COLUMN property_type text;
ALTER TABLE lead ADD COLUMN acreage_description text;
ALTER TABLE lead ADD COLUMN project_stage text;
ALTER TABLE lead ADD COLUMN service_timing text;
ALTER TABLE lead ADD COLUMN services text[] NOT NULL DEFAULT '{}';
ALTER TABLE lead ADD COLUMN attribution jsonb NOT NULL DEFAULT '{}';
ALTER TABLE lead ADD COLUMN owner_id text REFERENCES "user"(id);
ALTER TABLE lead ADD COLUMN next_action text;
ALTER TABLE lead ADD COLUMN next_action_due_at timestamptz;
ALTER TABLE lead ADD COLUMN last_activity_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE lead ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE lead ADD CONSTRAINT lead_commercial_channel CHECK(inquiry_type IS DISTINCT FROM 'commercial_site_assessment' OR (NULLIF(btrim(email),'') IS NOT NULL OR NULLIF(btrim(phone),'') IS NOT NULL));
CREATE INDEX lead_commercial_followup ON lead(inquiry_type,owner_id,next_action_due_at);
CREATE TABLE integration_ingress_key (
 key_id text PRIMARY KEY, source_instance_id uuid NOT NULL, enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE TABLE commercial_intake_receipt (
 id uuid PRIMARY KEY, source_instance_id uuid NOT NULL, submission_id uuid NOT NULL, event_id uuid NOT NULL,
 schema_version integer NOT NULL CHECK(schema_version=1), payload_sha256 text NOT NULL CHECK(length(payload_sha256)=64),
 accepted_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
 lead_id uuid NOT NULL UNIQUE REFERENCES lead(id), raw_intake jsonb NOT NULL,
 UNIQUE(source_instance_id,event_id), UNIQUE(source_instance_id,submission_id)
);
