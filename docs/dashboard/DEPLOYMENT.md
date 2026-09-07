# Deployment and support

Status on 2026-09-07: reviewed preview is deployed to staging and the production dashboard hostname. Full launch acceptance remains pending provider, device and pilot gates.

Railway project: `e83f79dd-d901-4ab1-836b-bdf272b58dc2` (p1-Land-Management).

| Resource                             | Identifier                           |
| ------------------------------------ | ------------------------------------ |
| Production environment               | 6126e9ca-b071-4c41-b7c0-aa945fa37067 |
| Dashboard web                        | 7d129f6d-9f9b-4790-b21c-d8919a0a079c |
| Dashboard worker                     | 171f4abc-c24f-4924-bc06-abf0a75a4c15 |
| Dashboard PostgreSQL (Postgres-EjJV) | 9488d9fe-6e0e-42c1-8965-8757a8b2a034 |
| Private bucket                       | 85f53342-3f1e-4552-ad78-2dc686951479 |
| Staging environment                  | 039000ad-9deb-448d-b340-ab84fc74ecd5 |
| Staging web                          | 586fc0ae-a3e3-4520-8c6e-b4c64bd6f7a0 |
| Staging DB (Postgres-x2kH)           | ad0db535-0f4d-4f5f-88eb-7e7522af8db9 |

Production URL: https://dashboard.p1landmanagement.com. Cloudflare DNS task owns its CNAME/TXT. Staging URL: https://p1-dashboard-staging-dashboard-staging.up.railway.app. Marketing website/Core resources must not be modified by dashboard deployment.

`node scripts/package-dashboard.mjs` creates an allowlisted temporary source snapshot, omitting environment files, website source/assets and Core. Explicitly target project/environment/service IDs on Railway commands. The Dockerfile is `artifacts/api-server/Dockerfile.dashboard`. New Railway services reject deprecated railway.json configuration: set service config through Railway tools/API. No dashboard railway.json is packaged; service settings are authoritative.

Web start: `node dist/dashboard/main.js`; predeploy: `node dist/dashboard/migrate.js`; health: `/api/healthz`; port 8080. Worker start: `node dist/dashboard/worker.js`; deploy only after web migrations succeed. Required web environment: private `DASHBOARD_DATABASE_URL`, `DASHBOARD_ORIGIN`, random `BETTER_AUTH_SECRET`, random `INTEGRATION_ENCRYPTION_KEY`, NODE_ENV and storage credentials. Workers share database and provider/crypto secrets through Railway variable references. Keep staging synthetic and avoid persistent duplicate provider resources.

Verify deployment status, health, setup behavior, TLS, authenticated no-store headers, deep links, static assets, provider redirects, uploads and webhook signatures before declaring release. Inspect logs without printing credentials or customer content. Roll back application deployment through Railway to the previously verified image; retain additive schema changes. Rehearse compatibility before production data is present.

Production dashboard DB volume backup schedule has DAILY/WEEKLY/MONTHLY enabled. Provider schedule retention is **not a guarantee of 30 daily recovery points**; confirm/implement the proposed 30-day retention before acceptance. A synthetic local pg_dump/restore succeeded previously (6 migrations, 2 properties, 2 field events); this is not a deployed restore rehearsal. Initial targets remain <=24 hours server data loss and restoration within one business day. Backup failure alerts, provider disconnection alerts and operational support ownership still need verification.

Owner authorized setup costs without another cost approval step. A source-backed assumption estimate is in [COSTS.md](COSTS.md); actual measured usage remains to be recorded from provider billing. Messaging, storage/egress, backups and QuickBooks subscription/payment eligibility are separate expenses.

## Reviewed preview candidate

Snapshot manifest: `preview-source-manifest.json` (SHA-256 `73b231fbf24132e4db951ca84f2e8f9d2eea12490f2e50c9c53eed228e619be8`). Staging deployment `d7ffd471-d0bd-4bf1-881d-89b98cb9cb72` reached SUCCESS. Health/setup, root/deep-link HTML, JS/CSS, logo and service worker returned200; anonymous clients/properties/file content returned401 with no-store. Browser rendered the supplied logo and fail-closed setup message.

Production pre-initialization backup `71ace7f8-6a28-42ba-8b1c-5bdbcadc144e` was created and listed by Railway. The private bucket synthetic write/read test passed and removed only its own probe object. This validates S3 connectivity, not authenticated image-route end-to-end behavior. Production web deployment `34c4634a-8148-4ffd-a602-80c8558151fe` reached SUCCESS. Logs confirm migrations0001–0007 applied; production health/setup, deep links and assets returned200. Anonymous clients/files and unsigned QuickBooks webhook returned401 with no-store. Browser verified the custom domain; live SVG exactly matches the supplied file. Owner setup remains configured:false until owner email and email provider activation are available.

Independent scoped reviews accepted the original six findings and two follow-ups; see `security-recheck-auth-files.md` and `security-recheck-api-qbo.md`. Parent independently reran the fresh synthetic suite (5 tests, no failures/skips, migration replay). No claim of complete provider/device/pilot acceptance is implied.

Production worker deployment `28a3cb2b-9c33-45b0-92b6-2c98b7e077e6` reached SUCCESS; startup logs showed container start with no application error in the inspected output. Provider jobs cannot be proven without authorized credentials and test accounts.

Owner onboarding activation, 2026-09-07: after authorized Mailgun credential provisioning, the existing reviewed preview was redeployed without new workspace code: web `6b4fa525-9084-4c19-94a0-5b6d82c37229`, worker `5b8bdb72-7306-4400-b792-41a32af4c5c2`, both SUCCESS. Live setup returned initialized:false/configured:true. Designated email is mike@p1landmanagement.com. A 24-hour setup authorization hash was stored securely; one setup message was accepted by Mailgun (`20260907070915.55774c0f5bda186d@mg.p1landmanagement.com`). No account password or MFA enrollment was performed by the agent. Provider delivery event and owner completion remain to be confirmed. No setup code or secret is stored in this repository.

DNS task independently verified the same owner setup message in Mailgun logs without opening its body: Accepted 03:09:15 Eastern, Delivered 03:09:16 Eastern, recipient Gmail server `2.0.0 OK`. This proves provider delivery, not that the owner has read it or completed setup.

## Contact and crew checkpoint (8039f99)

Independent scoped review accepted contacts roles/version/archive/audit and crew assignment/prerequisite/lifecycle checks. Fresh six-test synthetic suite and migration replay passed; frontend/backend typechecks and production builds passed. Snapshot manifest `contact-crew-source-manifest.json` SHA256 `e81865fb44b83d7b14e7ecabad73cf992ff956f6465073d7d96e7dcdef5c3202`. Staging `48356641-de94-4960-b17c-e2aee4aec3ce`, production web `7d961f4a-8eb5-4bb1-9d51-d8c111ba2bd1` and worker `7d672820-8a62-49ed-9a66-95cc204fdb8d` all reached SUCCESS. Both web migration logs applied0008. Health/setup/deep-link/assets200 and anonymous clients/contacts401 no-store verified. Pre-migration production backup `f93d4729-dbe2-4d04-b8df-624b5328c85f` listed.

Read-only Railway staging SSH pg_dump restored successfully into a disposable local PostgreSQL17 container: eight migrations, both new contact columns, zero clients,71557-byte archive,4.03seconds. No archive or credentials retained. This proves staging-schema logical restoration, not restoration of business data, Railway volume recovery, full application recovery or the production recovery targets.

Owner setup UX correction: readonly production query confirmed zero designated-owner accounts (therefore zero verified/MFA records). The setup entry previously defaulted to sign-in and mislabeled creation as invitation setup. Updated UI defaults configured/uninitialized root visits to owner creation, explains choosing a password, and returns verification links to explicit `?signin=1`. No account/security state or setup authorization changed. Browser fixture verified creation fields and existing-account sign-in toggle; deployment pending.
