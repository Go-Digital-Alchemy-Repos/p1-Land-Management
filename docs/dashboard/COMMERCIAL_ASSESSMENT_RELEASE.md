# Commercial assessment appointment release gate

This runbook governs the production promotion of the sales-only appointment addition in migration `0028_commercial_assessment_appointments.sql`. It applies to the commercial assessment workflow only; it does not authorize a wider CMS, identity, client portal, provider, or public marketing release.

## Current evidence

The candidate on `codex/commercial-assessment-sprint` passed API lifecycle, migration replay, generated-client, dashboard build, isolated staging database backup/restore, and a deployed staging create/retry/save/review/book/cancel/retry flow. It has not been promoted to production. The candidate keeps the operational slot's `property_id` null and records its commercial reservation only in `commercial_assessment_id`.

The production gate remains incomplete until a designated P1 owner accepts the authenticated browser journey and the candidate is merged at an approved, immutable revision.

## Read-only production recovery inventory — September 12, 2026

This inventory was captured without changing production. It establishes the recovery baseline that must be refreshed after the approved `main` revision is known; it is not a deployment authorization.

| Service | Current source | Deployment | Image identity | Health path |
| --- | --- | --- | --- | --- |
| `p1-dashboard` | `main` at `9c76d9bd0b48d3fb7780c9e2951ebe8280836f36` | `6e3fab73-7306-4cff-8f69-844afd4224fc` | `sha256:ec43f5adc8e5d2b036de933af8b91f8b23ce3cb98452f52bc51cf22c233957d6` | `/api/healthz` |
| `p1-dashboard-worker` | managed worker image | `773c0a1f-f5d8-48dc-b265-a38e716b6a8a` | `sha256:558a22df1db5e2b35139f341319c4e665ae1244e17d8d68f634966f1da20ca2d` | — |
| `p1-core` | `main` at `9c76d9bd0b48d3fb7780c9e2951ebe8280836f36` | `96871421-6fbd-4fbe-9f80-c43319fb5135` | `sha256:53536079a44bf7d663e56716d32273bce5b352b3632cc7103aa05133b38bf8c5` | `/api/health/ready` |
| `p1-land-management` | `main` at `9c76d9bd0b48d3fb7780c9e2951ebe8280836f36` | `c9caab69-7c94-46e0-8e59-436521b04e64` | `sha256:0072603a6b652a6fa19a00850a6fd4a27633dcc7bc3575cb07431f5f35d071a6` | — |

All four deployments reported `SUCCESS` at capture time. The eventual promotion record must replace this baseline with the exact approved release SHA, fresh database recovery checkpoint, migration ledger, and post-deploy evidence.

## Staging browser acceptance

Use an authorized, non-customer staging sales, manager, or owner account. This walkthrough creates only a clearly labelled synthetic lead, prospect property, baseline, availability slot, and appointment. Remove only those labelled test records afterward.

1. Open the Commercial Inbox and select the synthetic commercial inquiry.
2. Confirm the assessment panel is reachable from the normal authenticated dashboard shell, has visible labels and keyboard order, and does not expose the intake to a client, crew, finance, dispatch, or anonymous session.
3. Create a baseline; reload and confirm its title/scope are retained. Add one finding and one related recommendation, save, reload, and mark it reviewed.
4. Use **Find available times**, select the synthetic time, reserve it, reload, and confirm the confirmed appointment appears without a client, work order, proposal, invoice, or operational schedule booking.
5. Cancel with a reason, reload, and confirm the cancellation history remains while the time is available again. Confirm archiving is blocked while confirmed and allowed only after cancellation.
6. Capture only route/status/behavior evidence. Do not put contact details, raw intake, session values, or database credentials in screenshots or records.

The repository fixture at `artifacts/p1-dashboard/tests/commercial-assessment-browser.html` is an unauthenticated visual and keyboard-flow aid. It makes no network calls and cannot replace the deployed authorization check.

## Exact-revision production preflight

The Project Owner approves the merge and this limited promotion only after the PR is clean and all required checks pass. Record the resulting `main` SHA and confirm it matches the reviewed PR head before any production action.

1. Record the current production dashboard web/worker deployment and image identities, Core deployment identity, dashboard migration ledger, and the exact target `main` SHA.
2. Create and list a fresh production dashboard database recovery checkpoint. Restore a read-only logical copy into an isolated disposable PostgreSQL instance using a compatible major version; verify the ledger includes `0028` only after deployment. Keep provider and worker processing disabled in the restored copy.
3. Confirm a compatible application rollback candidate exists. Application rollback preserves the additive migration and all lead, assessment, appointment, audit, and identity history. A database restore is an incident-recovery action, never the normal rollback.
4. Confirm Core federation is still disabled unless its separately approved owner-browser acceptance and federation release gate have completed. This commercial release does not enable it.
5. Confirm no production customer or operational slot will be used as the acceptance fixture. Do not send provider traffic, email, SMS, or calendar invitations for this gate.

## Deployment and post-deploy checks

Deploy only the approved dashboard service package and its migration predeploy from the recorded immutable source. Do not deploy the repository's public-site configuration to the dashboard service and do not reverse migrations.

After health succeeds, verify: authenticated sales/manager/owner access; anonymous `401`; dispatch/finance/crew/client denial; a labelled synthetic prospect-only booking and cancellation; `assessment_slot.property_id IS NULL`; operational booking/listing does not disclose the commercial hold; archive is denied while confirmed; cancellation releases the hold; and audit history is present. Record deployment IDs, timestamp, target source SHA, health result, migration ledger, and the post-deploy fixture result.

If a fault appears, pause further writes, preserve logs and evidence, and prefer a compatible reviewed forward correction. A rollback must not reactivate a pre-guard scheduling image, delete commercial history, reverse migration `0028`, alter identity links, or reuse the acceptance fixture as customer data.
