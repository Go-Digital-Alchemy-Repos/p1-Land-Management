CREATE TABLE IF NOT EXISTS client_stack_onboarding_evidence (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('domain_plan', 'dns_verification', 'readiness_evaluation')),
  payload jsonb NOT NULL,
  recorded_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL,
  recorded_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_stack_onboarding_evidence_stack_recorded
  ON client_stack_onboarding_evidence (stack_id, recorded_at);
