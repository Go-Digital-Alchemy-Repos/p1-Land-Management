-- The original coordinate migration matched the formatted address exactly.
-- Normalize punctuation so the established Dickerman House record receives the
-- same verified placement when its address uses a period instead of a comma.
UPDATE property
SET latitude = 34.837789930201,
    longitude = -80.610640405095,
    location_precision = COALESCE(location_precision, 'approximate')
WHERE latitude IS NULL
  AND longitude IS NULL
  AND regexp_replace(lower(address), '[^a-z0-9]+', '', 'g') =
    '3003trinitychurchrdmonroenc28112';
