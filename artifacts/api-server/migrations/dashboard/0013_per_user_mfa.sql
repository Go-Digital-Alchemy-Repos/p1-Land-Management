ALTER TABLE staff_profile
  ADD COLUMN IF NOT EXISTS mfa_required boolean NOT NULL DEFAULT false;
