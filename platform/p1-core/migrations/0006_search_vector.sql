ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;--> statement-breakpoint

CREATE OR REPLACE FUNCTION therapist_search_vector_update() RETURNS trigger AS $$
DECLARE
  u_first text;
  u_last text;
BEGIN
  SELECT first_name, last_name INTO u_first, u_last
  FROM users WHERE id = NEW.user_id;

  NEW.search_vector := to_tsvector('simple',
    coalesce(u_first || ' ' || u_last, '') || ' ' ||
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.city, '') || ' ' ||
    coalesce(NEW.country, '') || ' ' ||
    coalesce(array_to_string(NEW.specializations, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.languages, ' '), '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_therapist_search_vector ON therapist_profiles;--> statement-breakpoint

CREATE TRIGGER trg_therapist_search_vector
BEFORE INSERT OR UPDATE ON therapist_profiles
FOR EACH ROW EXECUTE FUNCTION therapist_search_vector_update();--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_tp_search_vector_gin
ON therapist_profiles USING gin(search_vector);--> statement-breakpoint

UPDATE therapist_profiles SET search_vector = to_tsvector('simple',
  coalesce((SELECT first_name || ' ' || last_name FROM users WHERE id = therapist_profiles.user_id), '') || ' ' ||
  coalesce(title, '') || ' ' ||
  coalesce(city, '') || ' ' ||
  coalesce(country, '') || ' ' ||
  coalesce(array_to_string(specializations, ' '), '') || ' ' ||
  coalesce(array_to_string(languages, ' '), '')
)
WHERE search_vector IS NULL;
