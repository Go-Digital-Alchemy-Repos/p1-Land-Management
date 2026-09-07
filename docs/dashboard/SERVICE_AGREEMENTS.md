# Service agreements — implementation candidate

Status: independently reviewed backend committed as `d42d926`; staff UI and contract integration remain in progress. Migration0012 has not been applied to staging or production. This document describes the current API/domain candidate, not a completed billing feature or an accepted customer contract.

## Ownership and lifecycle

One agreement binds an operational property, recurring service and approved estimate revision. It snapshots approved scope. Management creates and edits drafts, activates reviewed terms, cancels effective future eligibility and creates successors using a new approved estimate. Version conflicts reject stale changes. Activated terms are immutable. Empty effective terms cancelled on their start date do not block replacement terms; other overlaps remain blocked under the recurrence lock.

Fixed monthly charges use explicit calendar periods covering a finite term, including staff-entered amounts for partial first/last months. Visit pauses and skipped work do not rewrite fixed amounts. Per-visit agreements use the original occurrence date and require reviewed work from the linked recurrence. Manually created work is not implicitly assigned to an agreement.

## Preview and preparation

The pre-activation preview returns every dated fixed period, planned fixed total, approved amount, all amounts already billed, remaining authorization and blocking reasons. Per-visit preview returns the rate and approved cap, with planned total null because future visit count is not assumed. Activation reuses the same assessment under locks. A separate charge preview reuses draft-preparation eligibility and returns before any insert or audit mutation.

Preparation creates a service billing draft only. A stable agreement/period or agreement/work identity produces one charge/draft after retries or competing requests. A global non-null work-order uniqueness constraint also prevents rebilling the same visit under a replacement agreement; the server reports an explicit conflict under the work lock. All billing_draft statuses count toward the approved estimate cap, including failed and posted records. No provider call, invoice send or payment action originates here. Cancellation preserves existing charge receipts and drafts; retrying acknowledged preparation returns the existing receipt.

Lock order: source operation identity, agreement identity, operational property, approved estimate, recurrence, agreement, then period/work. Activation shares the parent/estimate/recurrence order. Manual billing must continue using the same parent/estimate cap lock. Readers that assess financial eligibility also use this order.

## Candidate API

All paths are under `/api/v1` once reviewed and mounted. Current router is exported separately and is not registered with the application.

- GET `/service-agreements`: UUID cursor pagination, optional propertyId, limit1–100 (default30). Management/finance receive financial projections; dispatch receives scope/dates/status only.
- GET `/service-agreements/:id`: same role projections. Clients, crew and sales are denied in this candidate.
- POST `/service-agreements`: client-generated id, property/recurrence/estimate references, nullable predecessorId and explicit terms. Same creation id/body/actor returns the existing agreement; conflicting reuse fails.
- PATCH `/service-agreements/:id`: version and full draft terms.
- POST `/service-agreements/:id/activation-preview`: version; financial preview without activation.
- POST `/service-agreements/:id/activate`: version; management only.
- POST `/service-agreements/:id/cancel`: version, effectiveOn and reason; management only.
- POST `/service-agreements/:id/charge-preview` and `/charges`: exactly one periodStart or workOrderId; management/finance only.
- GET `/agreement-charge-queue`: cursor pagination, limit1–100 (default25). Management/finance only. Lists ready charges, unmatched reviewed recurring work and financial-review cases. Capped and partial-cancellation cases remain visible instead of vanishing after an error. Prepared fixed-period and per-visit charges affected by cancellation retain their draft reference and require explicit review. Prepared visit entries use a prepared-work charge identity so pagination remains unique.

Queue entries are a current snapshot; preparation always rechecks authorization and eligibility. UUID cursors are stable identities, not chronological ordering. A prepared cancellation review remains visible until a future reviewed correction workflow resolves it; no automatic accounting reversal is implied.

## Validation and remaining scope

`scripts/test-service-agreements.mjs` uses a disposable PostgreSQL instance and applies/replays migrations. Tests cover explicit monthly periods, per-visit inputs, lifecycle/version/overlap rules, financial-field omission for dispatch, previews without writes, concurrent source/cap protection, fixed charges despite paused visits, cancellation history, rescheduled occurrence membership and queue visibility/pagination.

Still required before full feature acceptance: finalized shared/OpenAPI and Drizzle contracts, integrated HTTP authorization regression coverage, staff agreement/preview/queue UI, full renewal/change-order/partial-cancellation correction UX, scheduled preparation and failed/unmatched action handling, populated agreement recovery coverage, staging live acceptance, QBO sandbox billing/reconciliation and pilot acceptance. Client agreement publication requires its own approved projection and existing property grants. No complete financial loop is claimed by the local domain tests.

An isolated application snapshot based on committed bc7d3a6 authentication temporarily mounts the candidate router for HTTP tests. The real middleware test passes manager/finance/dispatch projections; rejects client/crew/sales, anonymous and unassured-owner access; proves previews make no billing writes; and races manual progress billing against agreement preparation on one approved cap. The candidate path is recorded locally at `/tmp/p1-agreement-http-candidate.txt`. This test-only mount has not changed the shared application router.

## Reviewed database recovery evidence — September 7

The exact `d42d926` migration0012 (SHA256 `a54bd386424076c067ea6c562fc0537fc77a409d630422aee1d9168bfe92e06f`) was applied to a disposable restored staging snapshot already upgraded through0011. All 44 existing table row counts and canonical row hashes were unchanged. A new custom-format dump was restored into a second isolated PostgreSQL18 container; all table hashes, 64 agreement constraints and the global work-order charge unique index matched. Both containers used network `none`, ran no application workers and were removed.

Evidence: `/tmp/p1-agreement-restore-44d6dd29/report.json`. Post-upgrade dump SHA256 `78bf6795283de80cec7457b0bebc374e40906d3e8201852d9445d2e511bf2b6c` (115,240 bytes). This is database-only recovery evidence; new agreement tables were empty in the staging snapshot. Populated agreement behavior is covered separately by four domain tests and a real-auth HTTP test; populated recovery, application boot, object storage, grants, providers and live release remain distinct gates. The rehearsal checked SQL transaction/advisory-lock and ledger checksums; the Node migration runner apply/replay was exercised separately in the independent domain suite.

Do not roll back by dropping agreement tables or billing receipts. Use a compatible application correction and preserve charge history; a pre-migration database restore requires an explicit recovery decision accounting for writes accepted after the backup.
