CREATE TABLE IF NOT EXISTS woo_import_runs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_version text NOT NULL,
  source_store_id text NOT NULL,
  target_stack_id text NOT NULL,
  source_fingerprint text NOT NULL,
  high_water_mark text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('rehearsal', 'cutover')),
  status text NOT NULL DEFAULT 'planned' CHECK (
    status IN (
      'planned',
      'applying',
      'completed',
      'failed',
      'rollback_pending',
      'rolled_back',
      'manual_review'
    )
  ),
  enabled_phases integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  operator_reference text NOT NULL,
  latest_checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb,
  reconciliation jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_code text,
  started_at timestamp NOT NULL DEFAULT now(),
  completed_at timestamp,
  updated_at timestamp NOT NULL DEFAULT now(),
  CHECK (enabled_phases <@ ARRAY[1, 2, 3, 4, 5]::integer[]),
  CHECK (contract_version = '1.0.0')
);

CREATE UNIQUE INDEX IF NOT EXISTS woo_import_runs_active_target_unique
  ON woo_import_runs (source_store_id, target_stack_id)
  WHERE status IN ('planned', 'applying', 'rollback_pending');

CREATE INDEX IF NOT EXISTS idx_woo_import_runs_target_started
  ON woo_import_runs (target_stack_id, started_at);

CREATE INDEX IF NOT EXISTS idx_woo_import_runs_fingerprint
  ON woo_import_runs (source_store_id, source_fingerprint);

CREATE TABLE IF NOT EXISTS woo_import_mappings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL DEFAULT 'woocommerce' CHECK (source_system = 'woocommerce'),
  source_store_id text NOT NULL,
  entity_type text NOT NULL,
  external_id text NOT NULL,
  target_type text NOT NULL,
  target_id varchar NOT NULL,
  first_run_id varchar NOT NULL REFERENCES woo_import_runs(id) ON DELETE RESTRICT,
  latest_run_id varchar NOT NULL REFERENCES woo_import_runs(id) ON DELETE RESTRICT,
  normalized_source_hash text NOT NULL,
  target_baseline_hash text NOT NULL,
  lifecycle_state text NOT NULL DEFAULT 'active' CHECK (
    lifecycle_state IN ('active', 'manual_review', 'rolled_back')
  ),
  latest_imported_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (source_system, source_store_id, entity_type, external_id),
  UNIQUE (source_system, source_store_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_woo_import_mappings_latest_run
  ON woo_import_mappings (latest_run_id);

CREATE TABLE IF NOT EXISTS woo_import_audit_entries (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id varchar NOT NULL REFERENCES woo_import_runs(id) ON DELETE RESTRICT,
  batch_key text NOT NULL,
  entity_type text NOT NULL,
  source_ref text NOT NULL,
  target_type text,
  target_id varchar,
  action text NOT NULL,
  prior_source_hash text,
  next_source_hash text,
  prior_target_hash text,
  next_target_hash text,
  outcome text NOT NULL,
  issue_code text,
  rollback_snapshot jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (run_id, batch_key, entity_type, source_ref)
);

CREATE INDEX IF NOT EXISTS idx_woo_import_audit_run_created
  ON woo_import_audit_entries (run_id, created_at);

CREATE TABLE IF NOT EXISTS woo_import_quarantine_records (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id varchar NOT NULL REFERENCES woo_import_runs(id) ON DELETE RESTRICT,
  entity_type text NOT NULL,
  source_ref text NOT NULL,
  reason_code text NOT NULL,
  field_names text[] NOT NULL DEFAULT ARRAY[]::text[],
  source_hash text NOT NULL,
  retry_disposition text NOT NULL DEFAULT 'unresolved' CHECK (
    retry_disposition IN ('unresolved', 'retry', 'excluded-approved', 'resolved')
  ),
  resolved_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (run_id, entity_type, source_ref, reason_code)
);

CREATE INDEX IF NOT EXISTS idx_woo_import_quarantine_run_disposition
  ON woo_import_quarantine_records (run_id, retry_disposition);
