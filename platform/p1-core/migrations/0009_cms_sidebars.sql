CREATE TABLE "cms_sidebars" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false,
	"widgets" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "template" text DEFAULT 'full-width' NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "sidebar_id" varchar;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "sidebar_id" varchar;--> statement-breakpoint
CREATE INDEX "idx_cms_sidebars_default" ON "cms_sidebars" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "idx_cms_sidebars_updated_at" ON "cms_sidebars" USING btree ("updated_at");
