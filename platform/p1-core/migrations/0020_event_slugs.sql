ALTER TABLE events ADD COLUMN IF NOT EXISTS slug text;

WITH normalized AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(
            regexp_replace(lower(trim(title)), '[''"]', '', 'g'),
            '[^a-z0-9]+',
            '-',
            'g'
          ),
          '(^-+|-+$)',
          '',
          'g'
        ),
        ''
      ),
      'event'
    ) AS base_slug
  FROM events
  WHERE slug IS NULL OR slug = ''
),
numbered AS (
  SELECT
    id,
    base_slug,
    row_number() OVER (PARTITION BY base_slug ORDER BY id) AS duplicate_number
  FROM normalized
)
UPDATE events
SET slug = CASE
  WHEN numbered.duplicate_number = 1 THEN numbered.base_slug
  ELSE numbered.base_slug || '-' || numbered.duplicate_number
END
FROM numbered
WHERE events.id = numbered.id;

ALTER TABLE events ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
