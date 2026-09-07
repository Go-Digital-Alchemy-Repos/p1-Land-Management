CREATE TABLE "blog_taxonomies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"type" text NOT NULL,
	"parent_id" varchar,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_blog_taxonomies_type_slug_unique" ON "blog_taxonomies" USING btree ("type","slug");--> statement-breakpoint
CREATE INDEX "idx_blog_taxonomies_type" ON "blog_taxonomies" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_blog_taxonomies_parent" ON "blog_taxonomies" USING btree ("parent_id");
