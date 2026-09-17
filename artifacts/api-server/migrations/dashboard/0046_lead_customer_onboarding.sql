-- Durable replay receipt for explicitly reviewed Won -> customer onboarding.
CREATE TABLE lead_customer_onboarding (
 operation_id uuid PRIMARY KEY,
 lead_id uuid NOT NULL UNIQUE REFERENCES lead(id),
 client_id uuid NOT NULL REFERENCES client(id),
 actor_id text NOT NULL REFERENCES "user"(id),
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
 mode text NOT NULL CHECK(mode IN ('create','link')),
 lead_version integer NOT NULL CHECK(lead_version>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION preserve_lead_customer_onboarding() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Customer onboarding receipt is immutable'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER lead_customer_onboarding_preserve BEFORE UPDATE OR DELETE ON lead_customer_onboarding FOR EACH ROW EXECUTE FUNCTION preserve_lead_customer_onboarding();
