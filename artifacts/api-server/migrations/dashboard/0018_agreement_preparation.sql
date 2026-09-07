-- Automatic agreement preparation creates internal draft-only jobs. It never
-- posts to QuickBooks, sends invoices, charges a customer, or publishes work.
ALTER TABLE agreement_charge
  ADD COLUMN prepared_job_id uuid REFERENCES outbox(id),
  ADD CONSTRAINT agreement_charge_preparation_actor
    CHECK (prepared_by IS NULL OR prepared_job_id IS NULL);
CREATE UNIQUE INDEX agreement_charge_job_once
  ON agreement_charge(prepared_job_id) WHERE prepared_job_id IS NOT NULL;

CREATE TABLE agreement_preparation_scan (
 family text PRIMARY KEY CHECK(family IN ('fixed_agreements','reviewed_work')),
 cycle_id uuid,
 phase text NOT NULL DEFAULT 'idle' CHECK(phase IN ('idle','running')),
 cycle_started_at timestamptz,
 due_through date,
 upper_created_at timestamptz,
 upper_id uuid,
 last_created_at timestamptz,
 last_id uuid,
 pages_completed bigint NOT NULL DEFAULT 0 CHECK(pages_completed>=0),
 records_visited bigint NOT NULL DEFAULT 0 CHECK(records_visited>=0),
 jobs_enqueued bigint NOT NULL DEFAULT 0 CHECK(jobs_enqueued>=0),
 completed_cycles bigint NOT NULL DEFAULT 0 CHECK(completed_cycles>=0),
 last_progress_at timestamptz,
 last_completed_at timestamptz,
 next_cycle_at timestamptz NOT NULL DEFAULT now(),
 last_error_code text,
 CHECK((upper_created_at IS NULL)=(upper_id IS NULL)),
 CHECK((last_created_at IS NULL)=(last_id IS NULL)),
 CHECK(phase='idle' OR (cycle_id IS NOT NULL AND cycle_started_at IS NOT NULL
   AND due_through IS NOT NULL AND upper_id IS NOT NULL))
);
INSERT INTO agreement_preparation_scan(family)
VALUES ('fixed_agreements'), ('reviewed_work');
CREATE INDEX service_agreement_scan_order ON service_agreement(created_at,id);
CREATE INDEX work_order_preparation_scan_order ON work_order(created_at,id);

CREATE TABLE agreement_preparation_job (
 job_id uuid PRIMARY KEY REFERENCES outbox(id),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 retry_epoch integer NOT NULL DEFAULT 0 CHECK(retry_epoch>=0),
 attempts_in_epoch integer NOT NULL DEFAULT 0 CHECK(attempts_in_epoch>=0),
 failure_code text CHECK(failure_code IN
   ('eligibility_changed','invalid_payload','unsupported_version','transient_exhausted')),
 charge_id uuid REFERENCES agreement_charge(id),
 completed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((charge_id IS NULL)=(completed_at IS NULL))
);
CREATE TABLE agreement_preparation_retry_event (
 operation_id uuid PRIMARY KEY,
 job_id uuid NOT NULL REFERENCES outbox(id),
 request_sha256 text NOT NULL CHECK(length(request_sha256)=64),
 resulting_revision integer NOT NULL CHECK(resulting_revision>0),
 retry_epoch integer NOT NULL CHECK(retry_epoch>0),
 actor_id text NOT NULL REFERENCES "user"(id),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,resulting_revision)
);
CREATE FUNCTION reject_agreement_preparation_retry_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Agreement preparation retry history is append-only' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER agreement_preparation_retry_immutable
 BEFORE UPDATE OR DELETE ON agreement_preparation_retry_event
 FOR EACH ROW EXECUTE FUNCTION reject_agreement_preparation_retry_mutation();
