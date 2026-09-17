-- Explicit per-tool grants. Existing accounts are intentionally not auto-granted.
-- Owner reviews suggested legacy grants in User Manager before staff cutover.
CREATE TABLE business_account_access (
  user_id text PRIMARY KEY REFERENCES "user"(id),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  capabilities text[] NOT NULL DEFAULT '{}',
  form_notification_ids text[] NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  reviewed_at timestamptz,
  reviewed_by text REFERENCES "user"(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO business_account_access(user_id) SELECT user_id FROM staff_profile;

ALTER TABLE invitation ADD COLUMN capabilities text[] NOT NULL DEFAULT '{}';
ALTER TABLE invitation ADD COLUMN first_name text NOT NULL DEFAULT '';
ALTER TABLE invitation ADD COLUMN last_name text NOT NULL DEFAULT '';
ALTER TABLE invitation ADD COLUMN form_notification_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE invitation ADD COLUMN revoked_at timestamptz;
ALTER TABLE invitation ADD COLUMN created_by text REFERENCES "user"(id);
ALTER TABLE invitation ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

-- A plain team member has no implicit privileges, unlike old role-based staff.
ALTER TABLE staff_profile DROP CONSTRAINT staff_profile_role_check;
ALTER TABLE staff_profile ADD CONSTRAINT staff_profile_role_check CHECK(role IN ('owner','member','manager','dispatch','sales','finance','crew','client'));
ALTER TABLE invitation DROP CONSTRAINT invitation_role_check;
ALTER TABLE invitation ADD CONSTRAINT invitation_role_check CHECK(role IN ('member','manager','dispatch','sales','finance','crew','client'));
