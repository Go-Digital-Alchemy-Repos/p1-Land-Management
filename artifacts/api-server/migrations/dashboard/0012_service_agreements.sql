CREATE TABLE service_agreement (
 id uuid PRIMARY KEY,
 property_id uuid NOT NULL REFERENCES property(id),
 recurring_service_id uuid NOT NULL REFERENCES recurring_service(id),
 estimate_id uuid NOT NULL REFERENCES estimate(id),
 predecessor_id uuid UNIQUE REFERENCES service_agreement(id),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 500),
 starts_on date NOT NULL,
 ends_on date NOT NULL CHECK(ends_on>=starts_on),
 billing_mode text NOT NULL CHECK(billing_mode IN ('fixed_monthly','per_visit')),
 unit_amount_cents bigint,
 scope_snapshot text NOT NULL,
 estimate_revision integer NOT NULL CHECK(estimate_revision>0),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','cancelled')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_by text NOT NULL REFERENCES "user"(id),
 creation_fingerprint text NOT NULL CHECK(length(creation_fingerprint)=64),
 activated_by text REFERENCES "user"(id),
 activated_on date,
 activated_at timestamptz,
 cancellation_effective_on date,
 cancellation_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((billing_mode='per_visit' AND unit_amount_cents IS NOT NULL AND unit_amount_cents BETWEEN 1 AND 10000000000) OR (billing_mode='fixed_monthly' AND unit_amount_cents IS NULL)),
 CHECK((status='draft' AND activated_at IS NULL AND activated_on IS NULL AND activated_by IS NULL) OR (status IN ('active','cancelled') AND activated_at IS NOT NULL AND activated_on IS NOT NULL AND activated_by IS NOT NULL)),
 CHECK((status='cancelled' AND cancellation_effective_on IS NOT NULL AND cancellation_reason IS NOT NULL AND length(btrim(cancellation_reason)) BETWEEN 1 AND 1000) OR (status<>'cancelled' AND cancellation_effective_on IS NULL AND cancellation_reason IS NULL))
);
CREATE INDEX service_agreement_recurrence_term ON service_agreement(recurring_service_id,starts_on,ends_on);
CREATE TABLE fixed_charge_period (
 id uuid PRIMARY KEY,
 agreement_id uuid NOT NULL REFERENCES service_agreement(id),
 starts_on date NOT NULL,
 ends_on date NOT NULL CHECK(ends_on>=starts_on),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 10000000000),
 active boolean NOT NULL DEFAULT true,
 UNIQUE(agreement_id,starts_on),
 UNIQUE(id,agreement_id)
);
CREATE TABLE agreement_charge (
 id uuid PRIMARY KEY,
 agreement_id uuid NOT NULL REFERENCES service_agreement(id),
 source_key text NOT NULL,
 fixed_period_id uuid,
 work_order_id uuid REFERENCES work_order(id),
 billing_draft_id uuid NOT NULL UNIQUE REFERENCES billing_draft(id),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 10000000000),
 prepared_by text REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(agreement_id,source_key),
 UNIQUE(fixed_period_id),
 UNIQUE(agreement_id,work_order_id),
 FOREIGN KEY(fixed_period_id,agreement_id) REFERENCES fixed_charge_period(id,agreement_id),
 CHECK((fixed_period_id IS NOT NULL AND work_order_id IS NULL AND source_key LIKE 'period:%') OR (fixed_period_id IS NULL AND work_order_id IS NOT NULL AND source_key='work:'||work_order_id::text))
);
CREATE UNIQUE INDEX agreement_charge_work_once ON agreement_charge(work_order_id) WHERE work_order_id IS NOT NULL;
