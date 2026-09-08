CREATE TABLE IF NOT EXISTS account_avatar (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  mime text NOT NULL CHECK(mime = 'image/webp'),
  bytes integer NOT NULL CHECK(bytes > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
