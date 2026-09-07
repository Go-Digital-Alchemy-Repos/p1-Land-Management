# P1 Core production foundation

The dedicated backend is deployed; this is not public website, shared identity or end-to-end production release acceptance.

## Exact source and deployment

- Source: `bc3f41483b557afaebcd74fec350b11bd3c49acc`, copied P1 Core only. All904 source Git blobs were reverified with no extra files in the standalone upload context.
- Railway project `e83f79dd-d901-4ab1-836b-bdf272b58dc2`, production environment `6126e9ca-b071-4c41-b7c0-aa945fa37067`, Core service `45646c66-c173-4e23-81ab-64ca4d545bbe`.
- Deployment `549d2b7a-51b2-45d0-bf5a-0c3416c178c1` reached terminal SUCCESS. Image digest `sha256:70eade1a5c23c4d7ce62bee37949b901b677187483ea665824f225510f62e6c4`.
- Dedicated database service `7913729e-39e9-45a9-ac58-ceb18711a0a6` had zero public base tables immediately before deployment. Fresh volume backup `acb15fcf-cfdf-4a0d-b1f8-789d358a998f` was listed before initialization. Listing is not a production snapshot restore test; separate staging restore evidence is recorded elsewhere.

## Runtime verification

An operator read-only SSH check confirmed the deployed manifest source revision and `https://www.p1landmanagement.com` origin, application PID1 UID1000, `/api/health/ready`200, `/admin/login`200 and anonymous private-proof API401. The new production database contains zero users. No original Core user, credential or customer data was imported.

Build origins and full source revision were set explicitly and verified before upload. Runtime uses dedicated P1 PostgreSQL, storage and secrets. The original Core repository, deployment and database remain untouched.

## Remaining release and recovery gates

The existing public website remains on its previous release. Shared CMS/dashboard identity, fresh authorized owner access, production commercial sender/receiver keys, end-to-end inquiry delivery, public gateway/cache provisioning, final content/browser checks and production closeout remain unfinished. Do not create an alternate production owner or relax MFA to bypass the pending shared-identity review.

Before connecting the public gateway, verify private routing and same-origin preview/origin rules against this service, deploy matching reviewed public content contracts, and confirm last-valid publication recovery on the production cache volume. Production Core user count0 means administrator acceptance has not happened.

There is no prior P1 Core production application to revert to. If the initial backend needs correction, keep the previous public site active and deploy a reviewed compatible backend correction. Preserve the initialized database and audit history; do not use the empty pre-initialization backup to erase subsequent legitimate records. Once commercial receipts exist, retain their schema and compatible delivery/retry behavior. Object-storage, environment-secret and permission restoration remain separate recovery concerns.
