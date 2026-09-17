ALTER TABLE property ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE property ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE property DROP CONSTRAINT IF EXISTS property_latitude_range;
ALTER TABLE property ADD CONSTRAINT property_latitude_range
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);

ALTER TABLE property DROP CONSTRAINT IF EXISTS property_longitude_range;
ALTER TABLE property ADD CONSTRAINT property_longitude_range
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

-- Preserve the live property's verified street-address placement when the map
-- is introduced. New records are geocoded when they are created.
UPDATE property
SET latitude = 34.837789930201,
    longitude = -80.610640405095,
    location_precision = COALESCE(location_precision, 'approximate')
WHERE address = '3003 Trinity Church Rd, Monroe, NC 28112'
  AND latitude IS NULL
  AND longitude IS NULL;
