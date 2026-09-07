ALTER TABLE property ADD COLUMN lifecycle text NOT NULL DEFAULT 'operational';
ALTER TABLE property ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE property ADD COLUMN location_precision text;
ALTER TABLE property ADD COLUMN sales_owner_id text REFERENCES "user"(id);
ALTER TABLE property ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE property ADD CONSTRAINT property_lifecycle_client CHECK ((lifecycle='prospect' AND client_id IS NULL) OR (lifecycle='operational' AND client_id IS NOT NULL));
ALTER TABLE property ADD CONSTRAINT property_location_precision CHECK (location_precision IS NULL OR location_precision IN ('region','approximate','confirmed'));
CREATE INDEX property_lifecycle_active ON property(lifecycle,archived,id);
ALTER TABLE contact ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE contact ADD COLUMN reviewed_by text REFERENCES "user"(id);
ALTER TABLE contact ADD COLUMN reviewed_at timestamptz;
ALTER TABLE contact ADD COLUMN channel_source text;
ALTER TABLE contact ADD CONSTRAINT contact_prospect_channel CHECK(client_id IS NOT NULL OR NULLIF(btrim(email),'') IS NOT NULL OR NULLIF(btrim(phone),'') IS NOT NULL);
CREATE TABLE business_organization (
 id uuid PRIMARY KEY, display_name text NOT NULL, legal_name text, client_id uuid UNIQUE REFERENCES client(id),
 owner_id text NOT NULL REFERENCES "user"(id), archived boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organization_contact (
 organization_id uuid NOT NULL REFERENCES business_organization(id), contact_id uuid NOT NULL REFERENCES contact(id),
 role text NOT NULL CHECK(role IN ('requester','site_manager','facilities','procurement','owner_representative','other')),
 title text, source text NOT NULL, version integer NOT NULL DEFAULT 1,
 PRIMARY KEY(organization_id,contact_id,role)
);
CREATE TABLE property_organization (
 property_id uuid NOT NULL REFERENCES property(id), organization_id uuid NOT NULL REFERENCES business_organization(id),
 role text NOT NULL CHECK(role IN ('reported_owner','operator','manager','developer','prospective_customer','other')),
 source text NOT NULL, reviewed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(property_id,organization_id,role)
);
ALTER TABLE lead ADD COLUMN organization_id uuid REFERENCES business_organization(id);
ALTER TABLE lead ADD COLUMN contact_id uuid REFERENCES contact(id);
ALTER TABLE lead ADD COLUMN property_id uuid REFERENCES property(id);
CREATE TABLE commercial_context_operation (
 id uuid PRIMARY KEY, actor_id text NOT NULL REFERENCES "user"(id), lead_id uuid NOT NULL REFERENCES lead(id),
 fingerprint text NOT NULL CHECK(length(fingerprint)=64), result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_context_property ON lead(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX organization_contact_contact ON organization_contact(contact_id);
CREATE INDEX property_organization_organization ON property_organization(organization_id);
