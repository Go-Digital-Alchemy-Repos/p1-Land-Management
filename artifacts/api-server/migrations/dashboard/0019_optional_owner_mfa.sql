-- MFA remains available for every account, but super-admin policy now controls
-- whether each individual account must complete it. Undo the prior owner-only
-- default without altering any non-owner policy chosen by an administrator.
UPDATE staff_profile p
SET mfa_required=false
FROM installation i
WHERE i.id=1
  AND i.owner_id=p.user_id
  AND p.role='owner'
  AND p.active=true;
