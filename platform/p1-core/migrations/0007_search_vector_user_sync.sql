ALTER TABLE therapist_profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;--> statement-breakpoint

CREATE OR REPLACE FUNCTION compute_therapist_search_vector(
  first_name text,
  last_name text,
  therapist_title text,
  therapist_city text,
  therapist_country text,
  therapist_specializations text[],
  therapist_languages text[]
) RETURNS tsvector AS $$
  SELECT to_tsvector(
    'simple',
    coalesce(first_name || ' ' || last_name, '') || ' ' ||
    coalesce(therapist_title, '') || ' ' ||
    coalesce(therapist_city, '') || ' ' ||
    coalesce(therapist_country, '') || ' ' ||
    coalesce(array_to_string(therapist_specializations, ' '), '') || ' ' ||
    coalesce(array_to_string(therapist_languages, ' '), '')
  )
$$ LANGUAGE sql IMMUTABLE;--> statement-breakpoint

CREATE OR REPLACE FUNCTION therapist_search_vector_update() RETURNS trigger AS $$
DECLARE
  u_first text;
  u_last text;
BEGIN
  SELECT first_name, last_name INTO u_first, u_last
  FROM users WHERE id = NEW.user_id;

  NEW.search_vector := compute_therapist_search_vector(
    u_first,
    u_last,
    NEW.title,
    NEW.city,
    NEW.country,
    NEW.specializations,
    NEW.languages
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_therapist_search_vector ON therapist_profiles;--> statement-breakpoint

CREATE TRIGGER trg_therapist_search_vector
BEFORE INSERT OR UPDATE ON therapist_profiles
FOR EACH ROW EXECUTE FUNCTION therapist_search_vector_update();--> statement-breakpoint

CREATE OR REPLACE FUNCTION sync_therapist_search_vector_from_user() RETURNS trigger AS $$
BEGIN
  UPDATE therapist_profiles
  SET search_vector = compute_therapist_search_vector(
    NEW.first_name,
    NEW.last_name,
    title,
    city,
    country,
    specializations,
    languages
  )
  WHERE user_id = NEW.id
    AND search_vector IS DISTINCT FROM compute_therapist_search_vector(
      NEW.first_name,
      NEW.last_name,
      title,
      city,
      country,
      specializations,
      languages
    );

  RETURN NEW;
END
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_users_therapist_search_vector ON users;--> statement-breakpoint

CREATE TRIGGER trg_users_therapist_search_vector
AFTER UPDATE OF first_name, last_name ON users
FOR EACH ROW
WHEN (
  OLD.first_name IS DISTINCT FROM NEW.first_name
  OR OLD.last_name IS DISTINCT FROM NEW.last_name
)
EXECUTE FUNCTION sync_therapist_search_vector_from_user();--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_tp_search_vector_gin
ON therapist_profiles USING gin(search_vector);--> statement-breakpoint

UPDATE therapist_profiles AS tp
SET search_vector = compute_therapist_search_vector(
  u.first_name,
  u.last_name,
  tp.title,
  tp.city,
  tp.country,
  tp.specializations,
  tp.languages
)
FROM users AS u
WHERE u.id = tp.user_id
  AND tp.search_vector IS DISTINCT FROM compute_therapist_search_vector(
    u.first_name,
    u.last_name,
    tp.title,
    tp.city,
    tp.country,
    tp.specializations,
    tp.languages
  );
