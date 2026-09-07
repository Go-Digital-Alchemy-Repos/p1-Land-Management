CREATE TABLE session_assurance(session_id text PRIMARY KEY REFERENCES session(id) ON DELETE CASCADE, verified_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE billing_operation(id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id), fingerprint text NOT NULL, draft_id uuid NOT NULL REFERENCES billing_draft(id));
ALTER TABLE external_invoice ADD COLUMN ownership_verified boolean NOT NULL DEFAULT false;
ALTER TABLE billing_draft ADD COLUMN ownership_verified boolean NOT NULL DEFAULT false;
