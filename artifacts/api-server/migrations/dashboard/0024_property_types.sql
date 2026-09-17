CREATE TABLE IF NOT EXISTS property_type (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS property_type_name_unique
  ON property_type (lower(name));

ALTER TABLE property
  ADD COLUMN IF NOT EXISTS property_type_id uuid
  REFERENCES property_type(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS property_property_type_id_idx
  ON property(property_type_id);

INSERT INTO property_type (id, name, position) VALUES
  ('6c524aa4-90c3-48ec-9a80-d0d1da607c01', 'Commercial Office', 10),
  ('7d24f737-3a99-4a4d-ae59-b6fe0ffdb902', 'Mixed Use', 20),
  ('8ea8c1d9-1ee6-4b41-bbb2-97c71c4d9e03', 'Industrial', 30),
  ('9fb8112b-0c50-4636-a5e8-4f1b2cedaf04', 'Manufacturing', 40),
  ('ae413ad0-4e5e-4f92-a753-30af7b6c1005', 'Data Center', 50),
  ('bf9dbacd-91f3-48b4-a634-efca29d81106', 'Residential', 60),
  ('c02ff5df-510c-4c15-8a12-2a2a0aa41207', 'Neighborhood', 70)
ON CONFLICT DO NOTHING;
