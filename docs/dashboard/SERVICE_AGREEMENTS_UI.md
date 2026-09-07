# Service agreement workspace — staging validation

The staff workspace, shared contracts and API/navigation mounts were reviewed in `04ef3ad` and integrated with reviewed per-user MFA in `58d2180`. The combined runtime reached staging and passed real API/browser workflow checks. Production remains on the previously verified migration0011 release; agreement production release is not accepted.

## Staff workflow

The Agreements navigation entry is available to management, finance and dispatch. Management creates finite terms linked to an approved estimate and recurring service, reviews the activation plan, activates terms, records cancellation and creates a successor using a new approval. Finance reviews charge eligibility and explicitly prepares billing drafts. Dispatch receives scope, dates and status without financial fields. Crew, client and sales access is denied by the API.

A draft edit conflict preserves entered values. Staff can fetch the current saved terms into a separate comparison showing title, dates, billing basis, rate and every charge period. Selecting the reviewed version only changes the version used for the next explicit save; it does not merge data or save automatically. Further concurrent changes still fail the server version check. An activated or cancelled agreement cannot be edited through this draft flow.

The workspace remounts when its user identity or role changes. Parent callbacks from an unmounted workspace are ignored. Server authorization and role projections remain authoritative. The application mount must pass both `person.id` and `person.role`.

The billing queue shows ready charges and unresolved cancellation or eligibility cases. Preparation removes an acknowledged ready entry and retains the draft receipt in the preview. Refreshing or retrying uses the server's source identity; it cannot create another charge for that source. Cancelling an agreement does not cancel or credit an existing accounting invoice.

The workspace is online-only. Going offline disables actions without discarding entered form values. Fixed monthly periods use explicitly entered USD amounts, including partial months; no automatic proration or visit-count assumptions apply.

## Repeatable validation

- `node scripts/test-service-agreements.mjs`: disposable PostgreSQL migrations/replay, domain rules, Drizzle parity and real authenticated HTTP permissions/preview/cap races. Provider credentials are removed from the child environment. Run against the reviewed authentication baseline until pending identity changes are accepted.
- From `artifacts/p1-dashboard`, run `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4344`; then from the repository root run `node scripts/test-service-agreements-browser.cjs`. The synthetic browser fixture checks edit conflicts, explicit version review, activation, charge preparation, cancellation, renewal, role changes and mobile overflow. `AGREEMENT_BROWSER_ORIGIN` can select a different local fixture server.
- From `artifacts/p1-dashboard`, run `node --import ../api-server/node_modules/tsx/dist/loader.mjs --test tests/agreement-ui.test.ts` for exact cents, partial/leap months and term limits.

Current evidence: 15 synthetic browser checks with zero JavaScript errors; two money/date helper tests; a clean mounted production build and TypeScript checks. The database suite checks column types/nullability/defaults, parser-normalized check expressions, keys, foreign references/actions and indexes against the migrated database. These local checks are supplemented by the staging evidence below; they do not establish customer acceptance.

## Remaining acceptance

Production promotion remains subject to final staging acceptance and review. Scheduled preparation, correction/resolution of cancellation review items, client publication and the QuickBooks/pilot loop remain unfinished. A populated two-database recovery rehearsal now covers agreement records and receipts (see RECOVERY.md); Railway volume/object and full application restoration remain unverified. Synthetic browser fixtures do not replace physical-device or production-provider testing.

## Staging hold evidence — September 7

Dedicated staging backup `20bcfe40-8cc8-4346-8d81-c7d12eec0836` was listed before release. Exact agreement deployment `0cb4a12e-aaad-43bb-ba94-069a5dd64806` reached SUCCESS with image `sha256:852b45a5b2e048406195efb42f0f4f5f286d5b19a363ed840a1550dff91c1979`. Read-only checks verified packaged runtime source hashes, process UID1000, health/deep-link responses, anonymous API denial and all 13 preserved migration checksums.

The agreement runtime was uploaded seconds after the separate per-user MFA deployment. It contains the earlier authentication behavior while the newer migration remains present. No database rollback, synthetic business writes or provider actions were performed during this overlap. The release hold requires a coordinated combined runtime and fresh mounted-UI acceptance. Evidence: `/tmp/p1-agreement-release-smoke.json` and `/tmp/p1-agreements-staging-backup-04ef3ad.json`. A listed backup is not a restore rehearsal.

## Combined staging evidence — September 7

Exact commit `58d2180a5c992c1a906273ccb3d967d861ff88ee` reached SUCCESS as deployment `9b7c4865-0445-41fb-b68a-1925766c6dc1`. The package manifest SHA256 is `3c58fdb5a72846875a57d8e66a430e1aee61cdb5c084c890f83df103abc5f28c`. Runtime inspection matched242 non-test files, excluded18 test files, verified UID1000 and preserved all13 migration checksums. Health and agreement deep link returned200; anonymous agreement/queue requests returned401 with no-store. Fresh staging backup `54579e90-fc50-406a-b6bd-5d4bc67e4578` was listed before deployment; this is not restore evidence.

A synthetic live run passed19 checks: owner optional MFA access; owner settings requiring MFA for a client; real TOTP enrollment and current-session assurance; second unassured session denial; mounted agreement creation, explicit edit-conflict comparison, activation, draft preparation, retry receipt and cancelled-charge queue retention; financial/dispatch access and redaction; crew/client/sales denial; no-store; mobile width; and zero browser JavaScript errors. Database readback confirmed one agreement, one charge, one draft and zero posted invoices. All fixture sessions were deleted, profiles disabled and recurrence paused; business/audit history was retained. Reports: `/tmp/p1-agreement-live-report-19.json`, `/tmp/p1-combined-release-smoke.json`.

The run discovered unreachable Settings at1280×720 because the fixed sidebar had no vertical scrolling. A narrow local CSS correction passed pointer and keyboard reachability at1280×720 and390×844; it is not part of58d2180 and needs independent review and staging verification. Functional agreement checks used1440×1200 before resizing for mobile content checks. Initial creation clicks before the workspace finished loading were corrected in the browser harness by waiting for initial requests to settle; no application behavior was bypassed.

Expanded live acceptance subsequently passed22 checks with zero browser errors. Full scoped agreement, period, charge, draft and manager-audit snapshots were byte-equivalent as parsed JSON before and after both activation and charge previews. A successor was created through the UI using a separate approved estimate. Final fixture readback: two agreements, one charge, one billing draft, zero posted invoices. Cleanup completed as above. Current report: `/tmp/p1-agreement-live-report.json`; readback: `/tmp/p1-agreement-live-db-readback.txt`.

The reviewed sidebar correction and local QR/recovery controls subsequently passed live staging acceptance in exact `b97a372` (deployment `40f9cffa-53cf-46a8-bd26-b2ccb8f8459c`). Settings pointer and keyboard access now pass at1280×720 and390×844. Fourteen narrow live checks also verified QR encoding, recovery export content and the client MFA flow. See DEPLOYMENT.md for exact scope and limitations. The22 agreement checks above ran against58d2180; no agreement-domain change was introduced by the later UI candidate. Production acceptance is still pending.
