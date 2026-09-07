ALTER TABLE "blog_posts"
  ADD COLUMN "cover_image_position_x" integer DEFAULT 50,
  ADD COLUMN "cover_image_position_y" integer DEFAULT 50;

ALTER TABLE "events"
  ADD COLUMN "image_position_x" integer DEFAULT 50,
  ADD COLUMN "image_position_y" integer DEFAULT 50;
