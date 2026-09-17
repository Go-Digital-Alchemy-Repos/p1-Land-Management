CREATE TABLE agreement_composition_draft (
 id uuid PRIMARY KEY,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 200),
 client_id uuid REFERENCES client(id),
 property_id uuid REFERENCES property(id),
 lead_id uuid REFERENCES lead(id),
 source_estimate_id uuid REFERENCES estimate(id),
 estimate_id uuid UNIQUE REFERENCES estimate(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','prepared')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 content jsonb NOT NULL CHECK(jsonb_typeof(content)='object'),
 dates jsonb NOT NULL CHECK(jsonb_typeof(dates)='object'),
 source_templates jsonb NOT NULL CHECK(jsonb_typeof(source_templates)='array'),
 context_snapshot jsonb NOT NULL CHECK(jsonb_typeof(context_snapshot)='object'),
 created_by text NOT NULL REFERENCES "user"(id),
 creation_key uuid NOT NULL,
 creation_fingerprint text NOT NULL CHECK(length(creation_fingerprint)=64),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(client_id IS NOT NULL OR lead_id IS NOT NULL),
 CHECK((status='draft' AND estimate_id IS NULL) OR (status='prepared' AND estimate_id IS NOT NULL)),
 UNIQUE(created_by,creation_key)
);
CREATE INDEX agreement_composition_context_idx ON agreement_composition_draft(client_id,lead_id,updated_at DESC,id);
