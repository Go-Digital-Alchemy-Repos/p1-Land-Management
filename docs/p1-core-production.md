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

The existing public website remains on its previous release. Shared CMS/dashboard identity, fresh authorized owner access, production public-form delivery acceptance, public gateway/cache provisioning, final content/browser checks and production closeout remain unfinished. Do not create an alternate production owner or relax MFA to bypass the pending shared-identity review.

Before connecting the public gateway, verify private routing and same-origin preview/origin rules against this service, deploy matching reviewed public content contracts, and confirm last-valid publication recovery on the production cache volume. Production Core user count0 means administrator acceptance has not happened.

There is no prior P1 Core production application to revert to. If the initial backend needs correction, keep the previous public site active and deploy a reviewed compatible backend correction. Preserve the initialized database and audit history; do not use the empty pre-initialization backup to erase subsequent legitimate records. Once commercial receipts exist, retain their schema and compatible delivery/retry behavior. Object-storage, environment-secret and permission restoration remain separate recovery concerns.

## Commercial configuration preparation (subsequently activated below)

Fresh production-only signing material was configured with deployment skipped and matching values read back in Core and dashboard. The receiver key map preserved existing entries; Core has a matching key ID, source instance, secret and the dashboard commercial ingress URL/allowed host. No secret is recorded here. This configuration is not evidence of running delivery: activate the reviewed receiver first, redeploy compatible Core, and verify a synthetic durable receipt through the complete production pipeline before public promotion.

## Production sender activation and synthetic receipt

Deployment `ce12b993-2403-46c1-b7af-c23efe565982` reached SUCCESS using the same reviewedbc3 image digest as the foundation deployment. The configured signing material is now active after dashboardbc7 receiver promotion.

A synthetic phone-only request through the production Core managed-form HTTP endpoint returned201; an identical retry returned200 with receipt `f2eec0b8-2e9e-4d08-8aaa-833cc6c9474d`. Core CRM lead `27d3d1eb-007b-43ee-9ce9-1b54ac5d6d91` is `new`, source `website_form`, emailNULL. Both CRM and signed dashboard delivery jobs completed on their first attempt; job `11925e3c-82e0-45c4-8b7e-ae834a77378a` recorded validated dashboard acknowledgement for lead `9e921cf6-5b66-44c8-86b6-89884d71892f`. Evidence: `/tmp/p1-production-commercial-probe.json`.

The preflight verified zero Core users and disabled Mailchimp before submission; there were no notification effects or emails. The labelled synthetic records remain as release evidence. This verifies backend durable acceptance and processing, not production public-form UI, staff sign-in, email delivery or shared CMS identity. Independent dashboard database readback confirmed one lead, one receipt and one intake audit, New status, website_form source, phone-only contact and preserved project details. Root also queried the joined receipt/lead independently. Do not treat the existing public website as migrated by this backend result.
