ALTER TABLE website_restore_operation DROP CONSTRAINT website_restore_operation_status_check;
ALTER TABLE website_restore_operation ADD CONSTRAINT website_restore_operation_status_check
  CHECK (status IN ('reviewed','running','completed','uncertain','not_applied'));
