CREATE TABLE p1_identity_link (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 core_user_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
 canonical_user_id text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
 initial_grant_id uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE p1_federation_session (
 token_hash text PRIMARY KEY, link_id uuid NOT NULL REFERENCES p1_identity_link(id) ON DELETE RESTRICT,
 grant_id uuid NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE p1_federation_intent (
 token_hash text PRIMARY KEY, nonce_hash text NOT NULL, kind text NOT NULL CHECK(kind IN ('bootstrap','link','confirm')),
 payload jsonb NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE p1_federation_state (
 state_hash text PRIMARY KEY, nonce_hash text NOT NULL, verifier text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('bootstrap','link','login')), payload jsonb NOT NULL DEFAULT '{}',
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE p1_federation_bootstrap_consumption (
 id uuid PRIMARY KEY, proof_hash text NOT NULL, core_user_id varchar NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 consumed_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE p1_federation_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action text NOT NULL,
 core_user_id varchar, canonical_user_id text, link_id uuid, outcome text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX p1_federation_session_expiry ON p1_federation_session(expires_at);
CREATE INDEX p1_federation_state_expiry ON p1_federation_state(expires_at);
CREATE INDEX p1_federation_intent_expiry ON p1_federation_intent(expires_at);
