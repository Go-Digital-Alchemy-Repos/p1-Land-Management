# Dispatch readiness

Implemented locally, pending independent review and the0011 operational-property dependency. Not deployed. No additional migration or authentication-policy changes are introduced.

`POST /api/v1/work-orders/:id/readiness` accepts `{version,prerequisites:[{label,done}],reason}` for owner, manager and dispatch. Up to50 requirements, trimmed labels1–10000 characters and an audit reason1–1000 characters are accepted. Other roles are denied. The service takes the operational parent lock before locking the work order, preventing prospect records from entering this operational path.

Only draft, scheduled or delayed work can change. A stale version or started/closed work returns409. A no-op returns400 without changing history. An accepted edit advances the work version, clears the prior management override and audits before/after requirements, reason and cleared override. Requirements use the existing JSON representation; no equipment inventory, payroll or fleet subsystem is introduced. A new override must still go through the existing explicit manager-only status transition.

The Schedule job detail shows equipment, access, materials, permit, deposit and other requirement entry. Unsaved changes are labeled; failed saves preserve the draft. Editing is online-only and locked after work starts. Reopen a changed job from calendar details to obtain its latest version before retrying. Field concerns after start remain issues rather than retrospective readiness edits.

Validation: isolated12-test dashboard suite and migration replay passed with the0011 migration/helper supplied; both TypeScript checks and frontend/backend builds passed. Mounted tests exercise owner/manager/dispatch, denied client/crew/sales/finance/anonymous calls, simultaneous200/409 edits, no-op/invalid reason, prospect404, started409 and audit/override invalidation. An initial no-op failure exposed PostgreSQL JSONB key ordering; field-wise equality fixed it and the rerun passed. This readiness-focused candidate does not constitute acceptance of the entire prospect implementation.

Browser fixture `/tests/work-readiness-browser.html` exercises an unmet equipment item, checked draft, recorded override and rejected update. Checkbox/reason remain after the conflict, no save is claimed, and successful fixture submission clears the old override. This is synthetic UI evidence, not a live dispatch/pilot test.
