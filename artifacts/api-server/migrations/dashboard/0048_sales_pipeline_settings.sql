-- Additive presentation settings only. Stable lead statuses and transitions stay unchanged.
CREATE TABLE sales_pipeline_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision integer NOT NULL CHECK (revision > 0),
  config jsonb NOT NULL CHECK (jsonb_typeof(config) = 'object'),
  updated_by text NOT NULL REFERENCES "user"(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
