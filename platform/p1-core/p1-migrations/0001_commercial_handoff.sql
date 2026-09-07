ALTER TABLE cms_form_effect_jobs ADD COLUMN delivery_payload text;
--> statement-breakpoint
ALTER TABLE cms_form_effect_jobs ADD COLUMN delivery_result jsonb;
