# Service agreement workspace — review candidate

The staff workspace, shared client contracts and API/navigation mounts were independently reviewed and committed as `04ef3ad`. That exact runtime reached staging, but acceptance is on hold because an overlapping release also applied the newer per-user MFA migration0013. The next staging candidate must contain both reviewed feature sets. Production remains on the previously verified migration0011 release; agreement production release is not accepted.

## Staff workflow

The proposed Agreements navigation entry is available to management, finance and dispatch. Management creates finite terms linked to an approved estimate and recurring service, reviews the activation plan, activates terms, records cancellation and creates a successor using a new approval. Finance reviews charge eligibility and explicitly prepares billing drafts. Dispatch receives scope, dates and status without financial fields. Crew, client and sales access is denied by the API.

A draft edit conflict preserves entered values. Staff can fetch the current saved terms into a separate comparison showing title, dates, billing basis, rate and every charge period. Selecting the reviewed version only changes the version used for the next explicit save; it does not merge data or save automatically. Further concurrent changes still fail the server version check. An activated or cancelled agreement cannot be edited through this draft flow.

The workspace remounts when its user identity or role changes. Parent callbacks from an unmounted workspace are ignored. Server authorization and role projections remain authoritative. The application mount must pass both `person.id` and `person.role`.

The billing queue shows ready charges and unresolved cancellation or eligibility cases. Preparation removes an acknowledged ready entry and retains the draft receipt in the preview. Refreshing or retrying uses the server's source identity; it cannot create another charge for that source. Cancelling an agreement does not cancel or credit an existing accounting invoice.

The workspace is online-only. Going offline disables actions without discarding entered form values. Fixed monthly periods use explicitly entered USD amounts, including partial months; no automatic proration or visit-count assumptions apply.

## Repeatable validation

- `node scripts/test-service-agreements.mjs`: disposable PostgreSQL migrations/replay, domain rules, Drizzle parity and real authenticated HTTP permissions/preview/cap races. Provider credentials are removed from the child environment. Run against the reviewed authentication baseline until pending identity changes are accepted.
- From `artifacts/p1-dashboard`, run `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4344`; then from the repository root run `node scripts/test-service-agreements-browser.cjs`. The synthetic browser fixture checks edit conflicts, explicit version review, activation, charge preparation, cancellation, renewal, role changes and mobile overflow. `AGREEMENT_BROWSER_ORIGIN` can select a different local fixture server.
- From `artifacts/p1-dashboard`, run `node --import ../api-server/node_modules/tsx/dist/loader.mjs --test tests/agreement-ui.test.ts` for exact cents, partial/leap months and term limits.

Current evidence: 15 synthetic browser checks with zero JavaScript errors; two money/date helper tests; a clean mounted production build and TypeScript checks. The database suite checks column types/nullability/defaults, parser-normalized check expressions, keys, foreign references/actions and indexes against the migrated database. Evidence is local validation, not live deployment or customer acceptance.

## Remaining acceptance

Independent review, integration with the shared application navigation, staging migration and real-API browser checks remain required. Scheduled preparation, correction/resolution of cancellation review items, client publication, populated backup recovery and the QuickBooks/pilot loop remain separate unfinished requirements. Synthetic browser fixtures do not replace physical-device or production-provider testing.

## Staging hold evidence — September 7

Dedicated staging backup `20bcfe40-8cc8-4346-8d81-c7d12eec0836` was listed before release. Exact agreement deployment `0cb4a12e-aaad-43bb-ba94-069a5dd64806` reached SUCCESS with image `sha256:852b45a5b2e048406195efb42f0f4f5f286d5b19a363ed840a1550dff91c1979`. Read-only checks verified packaged runtime source hashes, process UID1000, health/deep-link responses, anonymous API denial and all 13 preserved migration checksums.

The agreement runtime was uploaded seconds after the separate per-user MFA deployment. It contains the earlier authentication behavior while the newer migration remains present. No database rollback, synthetic business writes or provider actions were performed during this overlap. The release hold requires a coordinated combined runtime and fresh mounted-UI acceptance. Evidence: `/tmp/p1-agreement-release-smoke.json` and `/tmp/p1-agreements-staging-backup-04ef3ad.json`. A listed backup is not a restore rehearsal.
