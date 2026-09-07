ALTER TABLE billing_draft ADD COLUMN posting_payload jsonb;
CREATE TABLE quickbooks_import_preview(id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id), payload jsonb NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE external_invoice(id text PRIMARY KEY, client_id uuid NOT NULL REFERENCES client(id), document_number text, total_cents bigint NOT NULL, balance_cents bigint NOT NULL, due_date date, payment_url text, updated_at timestamptz NOT NULL DEFAULT now());
