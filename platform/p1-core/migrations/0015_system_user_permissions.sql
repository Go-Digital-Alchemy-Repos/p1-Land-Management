ALTER TABLE users
ADD COLUMN admin_permissions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE users
ADD COLUMN form_notification_form_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
