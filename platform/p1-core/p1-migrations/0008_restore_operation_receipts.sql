-- Operational receipts must survive public-schema website archive restores.
CREATE SCHEMA IF NOT EXISTS p1_operations;
CREATE TABLE p1_operations.restore_receipts (
  operation_id uuid PRIMARY KEY,
  actor_id text NOT NULL,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','completed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
