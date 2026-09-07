ALTER TABLE "therapist_profiles"
  ADD COLUMN IF NOT EXISTS "directory_mode" text NOT NULL DEFAULT 'therapists';

CREATE INDEX IF NOT EXISTS "idx_tp_directory_mode"
  ON "therapist_profiles" ("directory_mode");
