# CRM and `/admin` retirement — current cutover delta

Status: decision and evidence delta only. This document does not authorize a
source freeze, account change, redirect, legacy-route removal, deployment or
production data operation.

This is the current delta against the CRM and retained-admin acceptance gates in
[the consolidation tracker](consolidation-acceptance.md) and the
[route inventory](admin-retirement-route-inventory.md). It was prepared from
`origin/main` revision `b9fd85d95b2a6dbedec36675b2ab5f8f6d981d44` on September
21, 2026. Customer payloads, account identities, credentials, and provider
configuration are intentionally excluded.

## What is evidenced

- The September 19 protected production run preserved the reviewed current
  three-source-lead batch: two distinct native inquiries were created, one
  receipt-matched inquiry was unchanged, and exact replay created no duplicate.
  The run preserved immutable source snapshots and did not modify Core source
  rows. See [production CRM preservation](crm-production-preservation-2026-09-19.md).
- The source-fenced runner has a deliberately narrow contract: 1–100 Core
  leads, no related clients, notes, or tasks, and only terminal non-commercial
  effects. It does not disable Core editing or establish incremental sync.
  [Its contract](fenced-crm-import.md) records that a checked point-in-time
  copy is not permanent CRM retirement.
- Native Sales presentation and its `/sales/pipeline` deep link were released;
  this accepts navigation and pipeline presentation only, not CRM write
  ownership. See [Sales workspace evidence](sales-pipeline-workspace.md).
- A production read-only account metadata capture found eight dashboard
  accounts, seven inactive. The active Owner was verified and MFA-enrolled, but
  the required-MFA policy flag was false. The capture is explicitly unreviewed,
  non-atomic, and not release approval. See
  [account-access reconciliation](account-access-reconciliation.md).

## Current implementation boundary

Current source inspection identifies still-active Core CRM write surfaces:

| Surface | Evidence | Cutover implication |
| --- | --- | --- |
| External intake | `platform/p1-core/server/routes/crm.routes.ts` exposes `POST /api/crm/leads`; `platform/p1-core/server/storage/crm.storage.ts` inserts `crm_leads`. | Do not remove or redirect this endpoint until an approved replacement intake contract, authentication/key transition, retry behavior, and receipt/idempotency proof exist. |
| Staff CRM operations | `platform/p1-core/server/routes/admin/crm.routes.ts` calls Core CRM storage for client notes and tasks; the storage layer also creates/updates leads and clients. | Core remains an editable CRM system. A historical import cannot make Dashboard the sole writer. |
| Won conversion | `platform/p1-core/server/services/crm.service.ts` creates a Core client and notes when a lead reaches Won. | Conversion semantics, operational-client creation, and onboarding authority must be explicitly reconciled before a write fence. |
| Forms/effects | Core forms-effect tests and storage retain `crm_leads` effects. | Public form and durable job behavior must stay available while ownership changes; disabling the UI or `/admin` does not retire this writer. |

This inspection is source-level evidence, not proof of current production
configuration or traffic. It found no implemented cross-system, permanent
ownership fence covering these paths. The temporary import fence is correctly
limited to its reviewed batch and must not be repurposed as one.

## Gates still open

1. **Declare and enforce one future writer.** The Owner and Orchestrator must
   choose the system of record for new inquiries, edits, notes, tasks, Won
   conversion, and operational-client creation. The approved implementation
   needs an enforceable source-side policy, a bounded fallback, audit evidence,
   and an unambiguous failure mode; a UI-only hide is insufficient.
2. **Reconcile broader historical scope.** The successful batch had no source
   clients, notes, or tasks. Any remaining records require a reviewed mapping,
   field/workflow parity disposition, a fresh source snapshot, and exact
   verification. Never use contact similarities to merge records.
3. **Run a coordinated cutover rehearsal.** Before an apply: retain protected
   backups; freeze the approved writers and pending durable effects; capture
   source/target counts and hashes; perform the approved import or exact replay;
   independently verify; exercise role-separated Sales and Customers workflows;
   and document forward recovery for an uncertain distributed commit. The
   existing runner is not two-phase commit and intentionally does not delete
   source data on uncertainty.
4. **Accept operational use.** Staff must complete a real, non-destructive
   prospect-context, follow-up, correction, archive-history, and Won workflow
   in the native Dashboard. The released Sales board alone is not this
   acceptance.
5. **Complete account policy decisions.** The Owner must disposition the seven
   inactive accounts (retain with rationale, suspend/close through an approved
   recovery-safe process, or re-enable after review) and decide whether Owner
   MFA is required. Preserve existing sessions/MFA secrets; validate recovery,
   revocation, notifications, and role access after the decision. Do not infer
   desired account state from the inventory.

## `/admin` consequence and safe sequence

The CRM-related legacy pages cannot yet be retired:

| Legacy page | Candidate native destination | Blocking evidence |
| --- | --- | --- |
| `/admin/crm` | `/sales` | Pipeline, lead/activity/custom-field workflow, exclusive ownership, and cutover acceptance are incomplete. |
| `/admin/crm/clients` | `/clients` | Reviewed Core-to-native client mapping and staff workflow acceptance are incomplete. |
| `/admin/crm/settings` | None demonstrated | Pipeline/settings configuration lacks a one-to-one approved native disposition. |

After the CRM gates close, retirement remains a separate reversible release:

1. create a fixed allowlisted redirect table with query filtering and no API,
   token, reset, or setup forwarding;
2. test the exact CRM legacy routes, encoded deep links, permissions, and
   browser back/forward behavior in staging;
3. verify public form intake, durable delivery, native bridge behavior, and
   recovery/rollback evidence while the legacy revision and data remain
   available; and
4. deploy reversible redirects first, observe the agreed window, then seek
   separate approval for any route removal.

The broader route inventory also carries independent gates for authentication,
CMS, media, backups, reporting, and provider recovery. Closing the CRM portion
does not authorize global `/admin` retirement.

## Owner and Orchestrator decisions required

- Select Dashboard or Core as the future authoritative CRM writer and name the
  approved transitional behavior for each active Core path above.
- Approve the scope and operator of the source/effects freeze, backup/recovery
  evidence, acceptance workflow, and emergency forward-recovery procedure.
- Review each remaining historical mapping and decide the disposition of fields
  or workflows that do not have native equivalents.
- Disposition inactive accounts and set the Owner MFA/recovery policy.
- Approve the CRM redirect table only after the CRM and account gates are
  independently accepted.

Until those decisions and evidence exist, the safe posture is to keep both
systems available, preserve the immutable import archive, make no destructive
source changes, and leave `/admin` in place.
