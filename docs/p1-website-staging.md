# P1 website and CMS staging — September 7, 2026

## Isolated resources

Project `e83f79dd-d901-4ab1-836b-bdf272b58dc2`; environment `website-staging` / `12ee0f33-fbfb-49b1-8602-f3f8b162670b`.

| Resource | ID / endpoint |
|---|---|
| Public gateway | `2b3f49c6-af90-41af-b5f7-6cfe9e0e0908` |
| Public staging URL | https://p1-website-staging-website-staging.up.railway.app |
| Core backend | `faa1114f-678e-414e-b227-e2f1ecac7755` |
| Core PostgreSQL | `5d84cc06-c9ad-408f-974f-5af29865670e` |
| PostgreSQL volume | `5613c21f-5d77-4083-8e3c-9aed1f19b83d` at `/var/lib/postgresql/data` |
| Public content cache volume | `c05d1a27-7d35-499b-8143-2feb93f38e9b` at `/app/data` |
| Dedicated media bucket | `89c3c4cb-fcc0-4358-ad3a-5327733a7b47`, `p1-media-staging`, iad |

Database password, Core session/setup secrets and S3 credentials are fresh staging-only values stored in Railway. No production credentials, users or customer data were copied. The original Core Platform remains untouched. Staging email delivery is not configured yet.

Gateway port is8080; Core port is5000. The public server references the Core service private domain. Core uses private-network PostgreSQL and a packaged same-origin staging manifest. Both services require the same external HTTPS origin for runtime preview/origin settings and build manifest inputs; see [manifest configuration](p1-manifest-build-config.md).

## Observed deployment evidence

- PostgreSQL deployment `8b3e0614-5539-49fa-be4d-191f676bbde5`: terminal SUCCESS.
- Core deployment `60426fc2-19f0-4274-b94f-2b395578a7c8`: terminal SUCCESS and `/api/health/ready` passed. Source `0f3f1a9e623d846b395b28138e2d030810f92156` from immutable Git archive.
- Public upload first exceeded Railway request size. Root deployment filters now omit copied Core except the shared manifest helper, and duplicate mockup imagery. Original source assets remain in Git. Public deployment `dbf739b9-3aef-4e68-9fa5-5fa93bc51835` was queued successfully from immutable source `6bdc0ab` after removing duplicate mockup imagery; no public staging acceptance is claimed yet. Core source remains `0f3f1a9` during this staging check; later differences are dashboard setup and deployment packaging, not Core application changes. Before production, record both complete source IDs and verify packaged manifest parity.

## Outstanding release gates

Verify public build/deployment, private gateway routing, authorized fresh P1 setup/sign-in, managed form receipt and CRM delivery, CMS preview/publish/restore/conflicts, snapshot recovery, isolated media read/write and rollback rehearsal. Shared CMS/dashboard identity is separately under implementation and must pass its own permission/MFA/revocation rollout checks. Healthcheck success alone does not establish full release acceptance. Production public website has not been replaced by this staging work.

## Staging storage and recovery evidence

Dedicated staging bucket synthetic SDK write/read/delete passed; only the probe object was removed. PostgreSQL volume backup `f77fd59a-78e3-4853-8a60-a841b81dd8e7` was listed after creation. A separate `pg_dump` from staging was restored with `pg_restore --exit-on-error` into an isolated PostgreSQL18 Docker container with networking disabled. All46 public tables restored; the synthetic inquiry and its completed CRM delivery job each appeared exactly once. The disposable restore container/volume were removed after verification. This validates a staging dump restore, not production rollback or restoration of the Railway volume snapshot.

Staged gateway bootstrap/login/me and CMS listing passed using a synthetic staging-only admin. Production owner credentials were not used. Public `/admin` exposed a301/308 trailing-slash loop; source `80ce207` fixes backend route normalization and adds staging noindex/deny-all robots. The upload timed out but Railway recorded `24c96680-6571-49e4-ae6a-b20ef7a5e7b9` as INITIALIZING; logs report no associated build. Do not claim that fix is live until a successful deployment and fresh HTTP checks.

## Runtime artifact and persistent-cache correction

The reviewed `80ce207fbea4d4799a0821d25485338849606e73` source was verified against1,680 Git blob hashes, built under Linux AMD64/Node22 and packaged as a28,743,383-byte runtime archive. SHA256 `dcd392c7adea65c487cbbdac87253ea436d70003999464a6ce992c20b1f2c8f9`; payload manifest SHA256 `5ecace8e5be3e3811b78148e86810947c17ba79f61afbae44b63cd49ed59088d`. Build/typecheck/image budgets/34routes/FAQ/25server-preview checks and standalone staging smoke passed. Runtime upload accepted as deployment `69c4ef9e-8c2b-4c68-a95d-93d7dedab9c9`; terminal SUCCESS verified. Fresh HTTP checks confirm `/admin` follows to200 without a loop, public `/contact/` still canonicalizes, and staging headers/robots prohibit indexing.

A live read-only process/filesystem check found Node running as UID1000 but the mounted `/app/data` owned by root with0755 permissions; no cache directory had been created. Assigned the dedicated staging `/app/data` and `/app/data/cms` directories to UID/GID1000 through an operator SSH operation, preserving the nonroot application process. A fresh published-content request then created one persisted snapshot, owned by1000. Repeat this provisioning check for any new/replaced production volume; Docker build-time directory ownership does not provision an attached Railway volume. See [Railway volume mounting and permissions](https://docs.railway.com/volumes). Do not set the application process to root as a workaround. Cache durability must be rechecked after deployment and volume restoration.

After deployment `69c4ef9e-8c2b-4c68-a95d-93d7dedab9c9`, an isolated child of the deployed application was started as UID/GID1000 on a separate loopback port with an unreachable Core origin. It loaded the volume snapshot and returned the same homepage content and revision10; two persisted records were present. The child was stopped afterward without changing the main service. This proves restart/backend-outage cache recovery for the staged snapshot. Browser navigation now reaches `/admin/login`; that screen exposed legacy Core branding/removed-module footer links, which are being corrected before production.

## Commercial and branded-admin candidate

Source `592d70bed8aa297b1f2d1f2a1b65c27abcf7a4c2` includes the reviewed commercial page/intake and dedicated P1 admin shell. Both staging applications are being prepared from this immutable revision with matching staging manifest origins. Initial Core deployment `527ac3f8-c32b-4c32-9295-7234cbe956c1` failed before build because the parent public `.railwayignore` excluded the nested Core Dockerfile. A standalone Core-only context copied from the exact Git archive avoids the public filter; replacement deployment `593fa19b-0aee-467e-9e3f-f38138a98069` was queued. This source/context change does not include pending identity policy, private-proof or sales-bridge work. Public runtime packaging for this revision remains in progress. Full commercial submission/CRM and new-route publish/restore checks follow successful deployment; local browser mocks are not delivery acceptance.


## Commercial staging deployment receipt

Both applications reached terminal SUCCESS from source `592d70bed8aa297b1f2d1f2a1b65c27abcf7a4c2`: Core `593fa19b-0aee-467e-9e3f-f38138a98069` and public gateway `7edc4379-65b2-4c97-8d70-9ebe8bb0f9d9`. The public runtime archive is 28,841,480 bytes, SHA-256 `8cde822e9835c4852a580f49589f2a635f0e7244e3ffd5654986b834c84214ca`; artifact manifest SHA-256 `de44405cff3b83623c6caee843facdb60c379654031b52e626cce81d84de8389`. The source archive matches all 1,705 Git blobs; parent independently verified all 469 packaged file hashes before upload. Linux/AMD64 build, typecheck, 35-route QA, image/JavaScript budgets, four form tests and nonroot runtime smoke passed.

Fresh live HTTP checks: `/healthz`, `/api/health/ready`, `/commercial` and `/admin/login` return200; commercial hero is in server HTML, and staging noindex headers and deny-all robots remain active. An initial smoke incorrectly expected the source commit in page HTML; that field is not exposed by the HTML contract, so this assertion does not establish a runtime defect. Commercial hydration initially has revision0; CMS import/edit/publish/restore and real submission-to-CRM acceptance are being checked separately. No production promotion is claimed.

Private proof editor commit `781a47e` is reviewed and pushed, but is not included in this frozen staging revision. See [private proof inventory](commercial/COM-03-private-proof-inventory.md) for its exact implementation and remaining release scope.


Deployed-container verification confirms `client.source.revision` equals `592d70bed8aa297b1f2d1f2a1b65c27abcf7a4c2`; `/proc/1/status` confirms the application process runs as UID1000. Synthetic commercial API receipt `e2d105f0-f226-43ec-8145-063385789a5a` was accepted once, with duplicate retry returning200 and the same receipt; the acceptance task verified one Forms record and one CRM lead after the worker interval. A separate browser inquiry receipt `c6915e2b-a537-4272-9dd0-a4e85a80f4c8` confirms the actual page form accepted and focused its confirmation. Full details and commercial page publication checks are still being recorded; these synthetic fixtures belong only to staging.


Commercial acceptance completed: the browser inquiry also has exactly one Forms record and one CRM lead with preserved details. The new `commercial/commercial-content` CMS entry was editable; a draft SEO marker stayed absent from public HTML until publication, then became crawler-visible. Historical restore plus publication returned the original content at published revision6. P1-only login branding and absence of excluded navigation were checked in the browser. The configured staging preview URL and authenticated draft API passed; visual iframe preview was not exercised in this slice. Staging SMTP remains unconfigured, and an existing failed notification job was observed rather than counted as delivered email. This receipt does not establish dashboard bridge or shared-identity acceptance.


## Private proof staging rollout

Core deployment `ecf124ec-ef6b-4f59-b924-2036ed0d7a1a` reached terminal SUCCESS from immutable commit `781a47e47da48df2ed969ad0bb583d6e09838520`. The standalone Core context matched all896 Git files. Exact-source TypeScript and six focused HTTP/UI proof tests passed. The first local Linux/AMD64 emulated production build failed inside esbuild's Go runtime after typecheck/client compilation; no source workaround was applied. Railway's native production build completed successfully. Public remains on592d70b; this backend-only change does not modify public source or content manifests.

Staging volume backup `3f730cc2-5208-46e8-86f9-49afb2ca0c6c` was listed before live proof-editor acceptance. This release adds no database migration; rollback uses Core deployment593fa19b and retains the encrypted private setting/audit record. Private proof API/UI live acceptance is underway. No public evidence or customer claim is approved or published by this rollout.


Live private proof acceptance: nine empty categories loaded; anonymous401, draft save/reload, stale409, generic-settings exclusion and public-contract exclusion passed. Synthetic draft was cleared while retaining two save audit entries; commercial HTML was unchanged. Authenticated desktop UI showed categories/save/history without JavaScript errors. Mobile at390px overflowed to507px because navigation and the category selector squeezed the form; this is an open layout fix, not a mobile pass.

Commercial bridge commit `66338b0459e26e4f61e583dbb68eaa5b49528ed8` is independently reviewed and committed, including bounded inbox/job pagination, legacy-route privacy and conversion-version fixes. Independent dashboard five-test/migration-replay and Core twelve-database-test selections passed. It is not part of the deployed Core781 release; receiver-first staged deployment, fresh integration keys and cross-service acceptance remain outstanding. Pending SSO/MFA work was excluded from the commit.


Proof mobile follow-up: the initial507px capture occurred during the sidebar transition. The settled page still overflowed to405px at a390px viewport because of the category selector. A page-only style correction constrains fields, wraps actions/history and leaves shared sidebar behavior unchanged. Isolated production assets tested against staging API now measure390px document width at390px for both narrow desktop and touch, and1440px at1440px desktop; keyboard category-to-input focus and mobile drawer open/Escape-close passed. Parent inspected the mobile screenshot. The correction is reviewed locally and awaits the next Core rollout.


## Cross-service commercial staging candidate

Dashboard receiver `e1912029-71bd-4a4f-949f-3cbc871f471d` reached SUCCESS from reviewed90307d3/66338b0; migration0010, role restrictions, health and assets were verified. Core sender/backfill/mobile proof deployment `1bbbe2b6-16c3-47b9-a47c-2d5b164998b0` reached SUCCESS from exact `bc3f41483b557afaebcd74fec350b11bd3c49acc`, with904 source files verified. The public website remains592d70b. Core pre-migration backup `6312d29f-a540-4308-a424-ee36af1abdae` is listed.

Fresh staging-only HMAC key and source instance were configured in each service with deploys suppressed, then read back in memory to verify exact sender/receiver equality. No production configuration or provider/session secret was reused. Core sends only to the explicitly allowed dashboard staging host. Cross-service inquiry/delivery/follow-up acceptance is underway; historical recovery remains preview-only until its synthetic receipt hashes are reviewed.

Owner login recovery6d1e024 plus test typing345db82 separately passed independent disposable tests and review. The change exposes enrollment/current-session assurance status and guides recovery while retaining the existing access guard; it does not change roles, bootstrap, account data or required MFA. Its production deployment is tracked by the dashboard task. This is separate from the unfinished shared CMS/dashboard identity work.


Cross-service acceptance passed: receipts `731fb2cc-f655-42f4-9665-89a681db809e` and phone-only `170b55d8-6ae9-455c-88a4-05d813ef6302` returned201, with retry200 and the same IDs. Each has one Core Forms record, one Core CRM lead, one completed commercial job with validated acknowledgement, and one dashboard lead preserving project fields. Phone-only email remains null. Manager follow-up saved and stale-version retry returned409; the live Sales inbox displayed the selected inquiry and follow-up without JavaScript errors. Mobile private proof now fits390px in the live Core build.

Historical receipt `e2d105f0-f226-43ec-8145-063385789a5a` was previewed only and is eligible for explicit recovery with snapshot SHA-256 `bd422293239e491b07002c0a705d27bc6956cb903a8f20bcda0dd81924cbd666`. No production outreach or historical resend occurred in these checks. Production dashboard receiver/recovery promotion is authorized after its separate staging recovery and backup checks; production Core/public rollout and shared identity remain outstanding.


## Historical commercial recovery acceptance

The Orchestrator authorized applying only staging receipt `e2d105f0-f226-43ec-8145-063385789a5a` with the reviewed snapshot hash above. The apply created job `9700c0e9-27a8-468e-b642-e2dc3398d31d`; repeating the same apply returned that existing job. It completed on attempt1 and produced one dashboard mapping. Forms receipts and the complete Core CRM API list were byte-equivalent before and after; the original CRM count remains1. The two actor-scoped backfill audit entries record enqueued/existing outcomes for that receipt and hash only.

Read-only database inspection afterward corroborated exactly three jobs: original CRM completed, original notification still failed after five attempts, and the new commercial delivery completed. No notification was retriggered. A SQL before-snapshot was not captured; API before/after snapshots and subsequent SQL timestamps/audit support this bounded acceptance. Evidence files: `/tmp/p1-backfill-apply-acceptance.json` and `/tmp/p1-backfill-db-supplement.json`.

The temporary dashboard staging manager was deactivated and all its sessions revoked after acceptance. Its revoked cookie returns401; the user row is retained as the audit actor. Cleanup evidence: `/tmp/p1-commercial-fixture-cleanup.json`. No production account, historical inquiry or outreach was changed. Production Core/public rollout and shared identity remain outstanding.
