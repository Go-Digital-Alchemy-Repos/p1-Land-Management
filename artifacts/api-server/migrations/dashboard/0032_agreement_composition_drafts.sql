-- Client-specific agreement composition is deliberately separate from the
-- operational agreement, estimate, billing and scheduling lifecycles. A draft
-- only becomes an estimate through an explicit future preparation action.
ALTER TABLE agreement_template
  ADD COLUMN source_slug text UNIQUE;

CREATE TABLE agreement_composition_draft (
  id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES client(id),
  property_id uuid REFERENCES property(id),
  template_id uuid NOT NULL REFERENCES agreement_template(id),
  template_version integer NOT NULL CHECK(template_version > 0),
  template_snapshot text NOT NULL CHECK(length(btrim(template_snapshot)) BETWEEN 1 AND 50000),
  title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 500),
  body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 50000),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','archived')),
  created_by text NOT NULL REFERENCES "user"(id),
  updated_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agreement_composition_draft_client_idx
  ON agreement_composition_draft(client_id,status,updated_at DESC,id DESC);

CREATE TABLE agreement_composition_line_item (
  id uuid PRIMARY KEY,
  draft_id uuid NOT NULL REFERENCES agreement_composition_draft(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK(position >= 0),
  description text NOT NULL CHECK(length(btrim(description)) BETWEEN 1 AND 2000),
  unit text CHECK(unit IS NULL OR length(btrim(unit)) BETWEEN 1 AND 100),
  quantity numeric(12,2) NOT NULL CHECK(quantity > 0 AND quantity <= 1000000),
  unit_price_cents bigint NOT NULL CHECK(unit_price_cents >= 0 AND unit_price_cents <= 10000000000),
  UNIQUE(draft_id,position)
);

CREATE TABLE agreement_composition_event (
  id uuid PRIMARY KEY,
  draft_id uuid NOT NULL REFERENCES agreement_composition_draft(id) ON DELETE CASCADE,
  actor_id text NOT NULL REFERENCES "user"(id),
  action text NOT NULL CHECK(action IN ('created','updated','line_item_added','line_item_updated','line_item_removed','archived')),
  prior_version integer,
  resulting_version integer NOT NULL CHECK(resulting_version > 0),
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agreement_composition_event_draft_idx
  ON agreement_composition_event(draft_id,created_at,id);
