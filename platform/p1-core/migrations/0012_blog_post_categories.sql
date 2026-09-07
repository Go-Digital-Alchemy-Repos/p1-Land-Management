ALTER TABLE "blog_posts"
ADD COLUMN IF NOT EXISTS "categories" text[];

UPDATE "blog_posts"
SET "categories" = ARRAY["category"]
WHERE "category" IS NOT NULL
  AND (
    "categories" IS NULL
    OR cardinality("categories") = 0
  );
