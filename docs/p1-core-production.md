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

## Verified TLS release and explicit readiness gate — 1869384

Current production Core deployment is `a55367ee-f115-4c30-b5ee-0a3ab967d03a`, terminal SUCCESS at `2026-09-07T16:46:02.685Z`, source `18693848dc592739c6e6c834f4f4dd4c91605074`, image `sha256:fab9de242ecfad249f19f6397b76d38f099d57042fb080fb42b8c2d4cacd7173`. All904 frozen Core source blobs were reverified; upload archive SHA-256 `83f66cf55bcdbfe694efde12349a0ef939c5af58ff73b60c98d58f08b020eab6`. No uncommitted dashboard/auth/native/agreement work was included.

A scoped production database custom dump was captured before this release: `/tmp/p1-core-production-before-1869384.dump`,141232 bytes, SHA-256 `405d0ca4fb601db8ad8bf57ab217c5617d448b6099b56f9babd9492283e2bb82`, captured `2026-09-07T10:35:42.267497Z`. File permissions are0600; PostgreSQL18 pg_restore catalog reading passed. This is not a fresh full restore rehearsal. After a session pause, read-only state comparison confirmed the recorded receipt/job data and empty users/CMS state remained unchanged before resuming deployment.

Only the source-revision variable and explicitly authorized Railway healthcheck path/timeout were changed. A digest comparison verified all other user-defined production variables were preserved, including provider/handoff credentials and origins. Public/admin origin remains `https://www.p1landmanagement.com`; port5000 and private database mode remain configured.

The first exact-source deployment52b2bb24 passed runtime verification. A same-image redeploy71271724 did not reflect the subsequently saved healthcheck in its deployment manifest. The Orchestrator authorized one fresh upload of the unchanged source to capture the saved configuration. The final a55367ee deployment manifest explicitly contains `/api/health/ready` and timeout30; its build log states `Healthcheck succeeded!`. This resolves the earlier saved-setting versus active-deployment discrepancy without weakening the healthcheck or altering application source.

Final read-only verification confirmed exact source revision, production origins, PID1 UID1000, included IPv6 certificate check, readiness200, admin/login200, anonymous CMS/private-proof401 and excluded APIs404. The retained synthetic commercial receipt and both completed first-attempt jobs have unchanged IDs, payload hashes, immutable delivery hashes and acknowledgement/result hashes. No new inquiry, email, CMS publication, user, or original Core change occurred.

Read-only production inventory:36 components are defined across35 routes, but all36 public CMS endpoints return404 because the database contains zero CMS content records. User count remains zero. This is an explicit remaining production import/identity gate, not evidence of completed CMS publication. Staging initialization of36 components is separately verified; production publication remains unauthorized here.

Evidence: `/tmp/p1-prod186-healthcheck-final.json`, `/tmp/p1-prod186-healthcheck-build.log`, `/tmp/p1-prod186-runtime.json`, `/tmp/p1-prod186-retention-{before,healthcheck-final}.json`, `/tmp/p1-prod186-config-verified.json`, and `/tmp/p1-core-production-before-1869384-backup.json`. Previous compatible bc3 production image/deploymentce12b993 remains the source of a rollback candidate; preserve all receipt/audit records rather than restoring an empty database. Final public gateway/shared-identity/customer acquisition acceptance remains separate.

## Initial-owner setup correction — 507f454

On September 7, production Core deployment `e2106796-b5c3-43e7-90a2-0e86b223a196` reached SUCCESS from reviewed source `507f45448769d8d601b9ae2b257e83670f90ecad`, with image digest `sha256:8d9e79bb20fda1eb1ef48340fb29710ac10d6a035d40305c526787f180ef1885`. The first upload for this change failed before runtime because the repository-root ignore rules omitted the Core application; the successful replacement used a clean, commit-only Core context and the existing Dockerfile build configuration.

The initial-admin page now displays the masked setup authorization-code field whenever the server requires it. `GET /api/setup/status` reports only `needsSetup` and the non-secret `setupTokenRequired` flag. Live verification confirmed `needsSetup:true`, `setupTokenRequired:true`, the new code field in the served admin asset, readiness `200`, and a valid-shaped first-admin request without the code rejected as `403`. The setup secret itself was not read, changed, logged, or exposed. The full Core suite passed 664 tests (27 database-gated tests skipped), production build passed, and the disposable federation migration replay passed 15 focused tests.

This does not create an administrator or reveal the deployment-held authorization code. The designated P1 owner must use that private code during the one-time `/admin/setup` flow, choose their own password, and complete the required owner-access acceptance steps.
