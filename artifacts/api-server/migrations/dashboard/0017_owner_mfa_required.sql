-- Ownership is a privileged role from its first successful initialization.
-- Existing installations are moved to the same policy without reopening setup.
UPDATE staff_profile p
SET mfa_required=true
FROM installation i
WHERE i.id=1
  AND i.owner_id=p.user_id
  AND p.role='owner'
  AND p.active=true;
