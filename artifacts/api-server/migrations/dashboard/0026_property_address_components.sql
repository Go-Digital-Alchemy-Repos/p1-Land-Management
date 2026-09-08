-- Keep the legacy display address for compatibility while storing the
-- components entered by the operations team. Structured components make
-- geocoding and future address validation deterministic for newly saved sites.
ALTER TABLE property ADD COLUMN IF NOT EXISTS address_line1 text;
ALTER TABLE property ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE property ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE property ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE property ADD COLUMN IF NOT EXISTS postal_code text;
