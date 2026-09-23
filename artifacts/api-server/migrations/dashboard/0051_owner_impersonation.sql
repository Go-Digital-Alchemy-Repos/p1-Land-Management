-- An Owner browser session may temporarily act as another active account.
-- The Better Auth credential remains the Owner's and is never copied to the
-- target. Deleting or revoking the Owner session removes the impersonation.
CREATE TABLE dashboard_impersonation (
  session_id text PRIMARY KEY REFERENCES session(id) ON DELETE CASCADE,
  owner_id text NOT NULL REFERENCES "user"(id),
  target_id text NOT NULL REFERENCES "user"(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (owner_id <> target_id)
);
CREATE INDEX dashboard_impersonation_target_idx ON dashboard_impersonation(target_id);

-- Login-free sample identities are managed separately from real invitations.
-- They have no password or linked auth account and use reserved .test emails.
CREATE TABLE dashboard_demo_persona (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL UNIQUE CHECK (role IN ('manager','dispatch','sales','finance','crew','client')),
  created_at timestamptz NOT NULL DEFAULT now()
);
