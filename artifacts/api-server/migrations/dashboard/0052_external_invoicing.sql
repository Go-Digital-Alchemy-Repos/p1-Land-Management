-- A draft version changes whenever its financial, lifecycle, ownership, or
-- posting fields change. Existing drafts begin at version 1. The external
-- invoice write compares the version and amount seen by the reviewer.
ALTER TABLE billing_draft ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);

CREATE FUNCTION bump_billing_draft_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.property_id,NEW.estimate_id,NEW.title,NEW.amount_cents,NEW.kind,
         NEW.status,NEW.quickbooks_id,NEW.balance_cents,NEW.payment_url,
         NEW.posting_request_id,NEW.posting_payload,NEW.ownership_verified,
         NEW.estimate_allocation_id)
     IS DISTINCT FROM
     ROW(OLD.property_id,OLD.estimate_id,OLD.title,OLD.amount_cents,OLD.kind,
         OLD.status,OLD.quickbooks_id,OLD.balance_cents,OLD.payment_url,
         OLD.posting_request_id,OLD.posting_payload,OLD.ownership_verified,
         OLD.estimate_allocation_id) THEN
    NEW.version := OLD.version + 1;
  ELSE
    NEW.version := OLD.version;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER billing_draft_version_before_update
  BEFORE UPDATE ON billing_draft FOR EACH ROW
  EXECUTE FUNCTION bump_billing_draft_version();

CREATE TABLE billing_draft_external_invoice (
  id uuid PRIMARY KEY,
  billing_draft_id uuid NOT NULL REFERENCES billing_draft(id),
  reference text CHECK (reference IS NULL OR length(btrim(reference)) BETWEEN 1 AND 120),
  invoiced_on date NOT NULL,
  note text CHECK (note IS NULL OR length(note) <= 2000),
  recorded_by text NOT NULL REFERENCES "user"(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  voided_by text REFERENCES "user"(id),
  voided_at timestamptz,
  void_reason text CHECK (void_reason IS NULL OR length(btrim(void_reason)) BETWEEN 1 AND 2000),
  operation_id uuid NOT NULL UNIQUE,
  operation_fingerprint text NOT NULL,
  void_operation_id uuid UNIQUE,
  CHECK ((voided_at IS NULL) = (voided_by IS NULL)
     AND (voided_at IS NULL) = (void_reason IS NULL)
     AND (voided_at IS NULL) = (void_operation_id IS NULL))
);
CREATE UNIQUE INDEX billing_draft_external_invoice_active
  ON billing_draft_external_invoice(billing_draft_id) WHERE voided_at IS NULL;
CREATE INDEX billing_draft_external_invoice_draft
  ON billing_draft_external_invoice(billing_draft_id,recorded_at DESC);
