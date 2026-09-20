-- Stored outside Core so a Core restore cannot erase its initiating audit trail.
CREATE TABLE website_restore_operation (
  id uuid PRIMARY KEY,
  actor_id text NOT NULL REFERENCES "user"(id),
  source_binding text NOT NULL CHECK (source_binding ~ '^[a-f0-9]{64}$'),
  archive_key text NOT NULL CHECK (length(archive_key) BETWEEN 1 AND 2048),
  archive_fingerprint text NOT NULL CHECK (archive_fingerprint ~ '^[a-f0-9]{64}$'),
  summary jsonb NOT NULL CHECK (jsonb_typeof(summary) = 'object'),
  status text NOT NULL DEFAULT 'reviewed' CHECK (status IN ('reviewed','running','completed','uncertain')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX website_restore_one_unresolved_source
  ON website_restore_operation(source_binding) WHERE status IN ('running','uncertain');
