CREATE TABLE agreement_charge_review_event (
 id uuid PRIMARY KEY,
 charge_id uuid NOT NULL REFERENCES agreement_charge(id),
 review_version integer NOT NULL CHECK(review_version>0),
 outcome text NOT NULL CHECK(outcome IN ('keep_due','correction_required')),
 cancellation_version integer NOT NULL CHECK(cancellation_version>0),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 snapshot_sha256 text NOT NULL CHECK(snapshot_sha256 ~ '^[0-9a-f]{64}$'),
 request_sha256 text NOT NULL CHECK(request_sha256 ~ '^[0-9a-f]{64}$'),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
 actor_id text NOT NULL REFERENCES "user"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(charge_id,review_version)
);
CREATE FUNCTION reject_agreement_review_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Agreement review history is append-only' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER agreement_review_immutable
 BEFORE UPDATE OR DELETE ON agreement_charge_review_event
 FOR EACH ROW EXECUTE FUNCTION reject_agreement_review_mutation();
CREATE INDEX agreement_charge_history ON agreement_charge(agreement_id,created_at DESC,id DESC);
