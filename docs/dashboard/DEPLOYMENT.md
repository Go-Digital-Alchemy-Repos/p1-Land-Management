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

Owner setup UX correction: readonly production query confirmed zero designated-owner accounts (therefore zero verified/MFA records). The setup entry previously defaulted to sign-in and mislabeled creation as invitation setup. Updated UI defaults configured/uninitialized root visits to owner creation, explains choosing a password, and returns verification links to explicit `?signin=1`. No account/security state or setup authorization changed. Browser fixture verified creation fields, existing-account sign-in toggle and explicit verification return route. Hotfix staging `6c126987-f246-477a-b137-265a863d5f7c` and production web `e5b85356-07f0-4142-9500-10d9e9b2ce66` reached SUCCESS. Live health200, new bundle and actual owner-creation form verified in browser. Source is the reviewed contact/crew snapshot with only `artifacts/p1-dashboard/src/main.tsx` replaced by commitfea0335 (SHA256 `85b75b0e97bb434148ebc56fc0c0b2ac1aaa05eaa84351e5ad1d75cfca2e9281`). Worker code unchanged. See RECOVERY.md for rehearsal scope.

## Assessment availability candidate (4079996)

Independent scoped review accepted service/routes/migration/UI: role isolation, version guards, buffer bounds, blackout/booking serialization, retained bookings and DST behavior. Full reviewed hashes are captured by `assessment-source-manifest.json` (manifest SHA256 `8c6b0a2cf7aae269479efd363b8cc547e201ebc07590c66f447027473837eb70`).

The isolated49fef60 archive initially failed the existing owner-assurance test because a concurrent authentication hunk had entered api.ts. Nothing from that candidate was deployed. Additive commit4079996 restored the existing guard; the isolated corrected source then passed seven tests, migration replay, frontend/backend TypeScript checks and production builds. The temporary archive's pnpm wrapper declined to replace symlinked dependencies; validation used the installed TypeScript/Vite/build entrypoints directly, without purging shared modules. Unreviewed identity work is excluded from this release.

Staging deployment `97a6aef4-88e6-4aec-ad26-d1fa10c8629d` reached SUCCESS, logged migration0009, served the new assessment bundle, and passed health/deep-link/anonymous API denial checks. Production pre-migration backup `04025840-1ed6-40bf-b2dd-cdd1d0b8fad9` was created and listed. Production web `53d30df6-fdda-45eb-ae99-157e58f52d47` and worker `f44c1be5-6ef3-4d3e-b9c2-0ed73a1386bd` both reached SUCCESS. Web logs applied migration0009; live health/setup/deep-link/new bundle200 and anonymous assessment APIs401 no-store verified.

A short-lived synthetic staging manager session read `/assessment-availability` successfully (200, no-store, New York timezone and expected defaults). Live crew denial was not completed; the isolated mounted-route suite covers it. Initial fixture cleanup hit a tooling error; explicit removal of that fixture's profile/session/user then succeeded in one transaction, and a follow-up count confirmed zero matching users. No production identities or customer records were used.

## Calendar UI checkpoint

Source combines the deployed4079996 backend with frontend/test commit7e42834. `calendar-source-manifest.json` SHA256 `07a84b5a55c1caf807fdc98f5d6e07fee95898829946c29edbdec77a68f03d08` records exact files; comparison with the assessment manifest confirms no backend/database/auth changes. Isolated eight-test suite plus migration replay, frontend typecheck and production build passed. Browser fixture verified visit selection, day mode and unassigned filtering; date tests cover New York midnight, spring/fall DST, leap-year and year boundaries.

Staging `878d0b65-e32b-4528-a31e-aa85d4ab3142` reached SUCCESS; health and calendar bundle verified after completion. An earlier asset check during DEPLOYING still saw the previous bundle and was correctly retried after SUCCESS. Production web `5bcc892a-c807-4132-8172-2a4b46ccd805` reached SUCCESS; live `/schedule`, new bundle, health200 and anonymous work-orders401/no-store verified. No worker change required. Calendar counts cover currently loaded work orders; the500-record API cap, date-range loading and editing/capacity validation remain outstanding.

## Reviewed scheduling and property-photo release (1bbe6cd)

Exact source is recorded by `scheduling-source-manifest.json`, SHA256 `6633de8b03c532a2a91c61e45f164a61d85e9b1cc4abc263a06a622ca781dea0`. It combines verified4079996/7e42834 with be8404b,7f10491,5e3f1cd,92b544d and1bbe6cd. Independent review repeated nine tests with no failures/skips and migration replay. Frontend/backend typechecks and builds passed. No0010 commercial or uncommitted identity changes are included; required owner MFA remains intact.

Staging `8ffb77a9-3de4-427a-9faf-c5ae58cc2391`, production web `0f265ded-e18d-4a33-9b17-089b555fefea` and matching worker `11a596f1-d2ce-4804-9b05-51543a12ebbe` all reached SUCCESS. Production health/deep link/newJS200 and anonymous scheduling/detail401 no-store passed. Worker logs show container start without errors in inspected output. Migrations remain0001–0009.

Staging synthetic signed sessions exercised manager/crew/client date lists200, manager/crew backlog200, client backlog403, nonexistent private detail404 and anonymous401 no-store. These empty-data checks complement the local populated multi-page isolation tests. All synthetic accounts were removed. Railway CLI initially chose an unrelated local SSH key; explicitly selecting the existing Railway key resolved the transport failures. No application authentication change was made.

Browser at390×844 verified the full App selects a job absent from the legacy first500 list and exposes its field actions. Viewport was restored. This is browser emulation, not physical-device acceptance. Photo fixture verifies rejected publication remains private; real authenticated S3 acceptance is still outstanding.

Pre-release backup `b057f4e7-9c3c-4705-91ba-ed93f43fe44b` was created and listed. Application rollback targets are previous web `5bcc892a-c807-4132-8172-2a4b46ccd805` and worker `f44c1be5-6ef3-4d3e-b9c2-0ed73a1386bd`; this release adds no migration, so retain0001–0009 and revert images together if required. Actual rollback execution remains an acceptance gate, as documented in RECOVERY.md.

## Commercial receiver staging checkpoint (90307d3)

Independent inbox re-review passed nine delayed-response assertions after the selection/save race fix. Exact source is `commercial-source-manifest.json` SHA256 `1327943ccc76a732c928f0a7d8b2ec528d24fe06c8db370061f228f48541c81b`. Isolated validation passed nine dashboard tests and five commercial receiver tests, migration replay and frontend/backend typechecks/builds. The test runner used installed Node/tsx directly after the pnpm wrapper declined to replace symlinked dependencies; no shared dependency tree was removed.

Dashboard staging deployment `e1912029-71bd-4a4f-949f-3cbc871f471d` reached SUCCESS. Migration0010 and the receipt table were verified in the staging database. A dedicated staging HMAC source/key configuration was validated without displaying secrets. Signed synthetic manager/sales sessions returned list200 and absent detail404; crew/client/finance/dispatch returned403 for both. Anonymous requests returned401/no-store; health and reviewedJS200 passed. All temporary role-check accounts were removed. Parent owns Core rollout and the cross-service acceptance fixture. Production commercial promotion remains pending that acceptance; this checkpoint is not a production release.

## Production commercial receiver and owner recovery (345db82)

Independent recovery review accepted enrollment/assurance status and unchanged fail-closed actor access. Source manifest `owner-recovery-source-manifest.json` SHA256 `b140d29b06875233436330a2e46b27f0fc0059229897ef3862c3cc124810920d` combines90307d3 with6d1e024/345db82. It excludes0011, uncommitted identity policy and later generated-client work.

Staging `2964b456-6000-4871-aed0-836d07314801`, production web `0c02c3e1-ad33-4650-865c-7bb618607119` and worker `9bec9270-89b9-4387-9ced-7c6c65bbdf68` reached SUCCESS. Production migration logs confirm0010 applied; health/root/reviewedJS200 and anonymous /me/inbox401 no-store passed. Staging live synthetic owners without enrollment or session assurance reported ownerMfaRequired:true and business403; an assured owner reported false and200. Fixtures removed. Actual owner MFA completion remains unverified.

Fresh production backup `6efd6baa-cb13-46ab-bda2-f8c3c62952ee` was listed before migration0010. Parent verified live Core-to-dashboard staging idempotency, phone-only preservation and follow-up409 handling before authorizing promotion. Production signing keys and Core sender activation are parent-owned and were not provisioned by this deployment.

Rollback must retain0010 and the commercial role filters from66338b0 once commercial receipts exist. Do not blindly restore the earlier pre-commercial application: its legacy lead list lacks those filters. A recovery-UI rollback can rebuild the reviewed90307d3 source (with66338b0) and redeploy compatible web/worker; it preserves the commercial schema/authorization but loses the new MFA recovery UI. Prefer a reviewed correction that retains both. Do not roll back database history or resend inquiries automatically.
