CREATE TABLE core_federation_authorization_code(
  id uuid PRIMARY KEY,
  code_hash text NOT NULL UNIQUE,
  code_challenge text NOT NULL,
  client_id text NOT NULL,
  redirect_uri text NOT NULL,
  canonical_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  canonical_session_id text NOT NULL,
  owner_attested boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX core_federation_authorization_code_expiry_idx
  ON core_federation_authorization_code(expires_at);

CREATE TABLE core_federation_browser_request(
  id uuid PRIMARY KEY,
  nonce_hash text NOT NULL UNIQUE,
  code_challenge text NOT NULL,
  client_id text NOT NULL,
  redirect_uri text NOT NULL,
  state text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX core_federation_browser_request_expiry_idx
  ON core_federation_browser_request(expires_at);

CREATE TABLE core_federation_grant(
  id uuid PRIMARY KEY,
  canonical_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  canonical_session_id text NOT NULL,
  owner_attested boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX core_federation_grant_expiry_idx ON core_federation_grant(expires_at);
