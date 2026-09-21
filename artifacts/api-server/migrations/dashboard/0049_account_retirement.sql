-- Retired accounts retain their immutable historical references while losing every
-- authentication and operational path. A recovery marks the tombstone restored;
-- it does not reactivate the original account or reissue sessions/invitations.
CREATE TABLE account_retirement (
  user_id text PRIMARY KEY REFERENCES "user"(id),
  retired_at timestamptz NOT NULL DEFAULT now(),
  retired_by text NOT NULL REFERENCES "user"(id),
  original_role text NOT NULL,
  original_active boolean NOT NULL,
  prior_capabilities text[] NOT NULL DEFAULT '{}',
  prior_form_notification_ids text[] NOT NULL DEFAULT '{}',
  restored_at timestamptz,
  restored_by text REFERENCES "user"(id),
  CHECK (original_active=false),
  CHECK ((restored_at IS NULL) = (restored_by IS NULL))
);
CREATE INDEX account_retirement_active_idx ON account_retirement(user_id) WHERE restored_at IS NULL;
