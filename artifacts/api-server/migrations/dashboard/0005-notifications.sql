CREATE TABLE notification (id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id), title text NOT NULL, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE sms_consent (user_id text PRIMARY KEY REFERENCES "user"(id), phone text NOT NULL UNIQUE, opted_in boolean NOT NULL, consent_text text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE outbox ADD COLUMN provider_message_id text;
ALTER TABLE outbox ADD COLUMN dedup_key text UNIQUE;
