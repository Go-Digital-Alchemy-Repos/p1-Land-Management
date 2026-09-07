# P1 backend operations

This is an independent P1-owned adaptation of Core Platform revision `aad2057`. Never point it at the original Core Platform database, object bucket, secrets, or deployment. The public React website lives outside this directory. This app provides `/admin` and `/api` behind the P1 gateway.

## Build and configuration

Use Node 22, `npm ci`, `npm run check`, and `npm run build`. `Dockerfile` uses a non-root Node 22 runtime and only copies the compiled app plus production dependencies. Build context is this directory. `dist/config` contains the reviewed P1 client-site manifest. Production runs `node dist/index.cjs`.

Required production values: dedicated `DATABASE_URL`, fresh `SESSION_SECRET` (32+ characters), fresh `SETUP_TOKEN`, `APP_URL=https://www.p1landmanagement.com`, `PUBLIC_SITE_ORIGIN=https://www.p1landmanagement.com`, `CORE_PLATFORM_ADMIN_ORIGIN=https://www.p1landmanagement.com`, `TRUSTED_ORIGINS=https://www.p1landmanagement.com`, `CLIENT_STACK_ID=p1-land-management`, and `CLIENT_SITE_MANIFEST_PATH=/app/dist/config/p1-client-site-manifest.json`. Never place secrets in `VITE_*` values. Railway private database traffic requires `DATABASE_TLS_MODE=private` and Railway project/environment identity; external databases require verified TLS. Production rejects loopback-development TLS bypasses.

The gateway must forward `/admin`, `/api`, and `/r2` to this backend while preserving cookies and public Origin. Dashboard assets use `/admin/assets`. User-facing links use configured `APP_URL`, never the backend's private Host header. Set the P1 object-store credentials in environment variables using the adapter's documented S3 settings, or configure a dedicated P1 R2 bucket. SMTP requires P1 sender identity and provider credentials; do not reuse Core Platform sender credentials.

## Database and initial administrator

`p1-migrations/0000_p1_foundation.sql` creates 46 P1 tables, including durable forms, CRM, versioned website content and anonymous acquisition events. The migration runner applies only `p1-migrations`; original legacy reconciliation is not executed. Ecommerce, membership, portfolio, WooCommerce and directory-specific tables are absent. The empty `therapist_profiles` compatibility table is retained exclusively for the installed-but-disabled Careers location foreign key. Upstream types retained for compatibility do not enable those modules.

Initialize a fresh database with `npm run db:verify` before local development. Production migrates before accepting traffic. Visit `/admin/setup`, provide the one-time deployment setup token and create the P1 administrator. Setup refuses a second administrator bootstrap. Add additional admin/editor users through Users. The P1 cookie name is `p1_admin_token`; secure cookies apply in production. Roles and permissions are checked on the server.

## Content publishing

Open CMS → P1 Website (`/admin/cms/website`). It lists 34 page components plus one shared navigation/business-details component. Shared content belongs to the `home/site-chrome` identity. Editing offers draft save, iframe preview, revision-aware publish, and restore-as-draft. Concurrent stale changes return HTTP 409. Preview uses exact-origin messages and does not expose drafts through public endpoints. Website URLs and component contracts come from the manifest. CMS routes reserve `/admin`, `/api`, `/assets`, `/uploads`, `/r2`, and `/health`.

## Estimate requests and recovery

`POST /api/forms/p1-estimate/submit` accepts flat JSON: `name`, `email`, `phone`, `company`, `address`, `acreage`, `propertyType`, `services` (string array), `message`, optional attribution (bounded string map), and empty optional `website` honeypot. Send `Idempotency-Key` once per logical inquiry. New requests return 201; replays return 200 with the same `submissionId`. Acceptance means the submission and effect jobs committed together. Never infer a CRM lead from call or email clicks.

CRM processing runs every 30 seconds, starts leads in New with source `website_form`, and preserves project data. Distinct submissions from the same person create separate inquiries. The same submission cannot create duplicate lead activity. Notification delivery is independent and at least once; a failed email cannot roll back or remove the inquiry. A worker restart recovers expired claims. Staff can see failed jobs and requeue them in Forms → Lead delivery monitoring. Retry resets exhausted attempts; provider errors remain redacted. Configure a P1 notification recipient before launch; otherwise estimate notifications fall back to active administrators.

The dashboard shows accepted inquiries, failed deliveries and the six CRM stages. `/api/p1/analytics` is restricted to CRM-authorized users and separates anonymous click/form events from CRM lead outcomes. Access logs contain status/timing and request IDs, not response bodies or inquiry content.

## Release and rollback

Before release, run focused tests and the full suite under Node 22, migrate a fresh disposable database, verify login/editor permissions, submit a real staging inquiry, wait at least 35 seconds for CRM processing, test duplicate requests and failed job retry, and publish/restore representative page content through the public gateway. Confirm disabled/removed endpoints return 404 and public HTML never contains draft content. Verify storage uploads, SMTP and backup restore against P1-only test resources.

Take a P1 database backup and record deployed revision before production migration or release. Do not downgrade to upstream Core Platform migrations. Roll back the application image only to a previously validated P1 revision compatible with the existing P1 schema. Restore a database snapshot only into an isolated replacement database after identity checks; do not overwrite live inquiries. The built-in backup tool enforces stack identity. Production release remains the Orchestrator's responsibility.
