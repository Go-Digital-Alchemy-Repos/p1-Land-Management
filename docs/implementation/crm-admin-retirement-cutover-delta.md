# CRM and `/admin` retirement — current cutover delta

Status: cutover evidence and release gates. The Owner's September 22 request to
finish the CRM merge and retire `/admin` establishes Dashboard Sales as the
intended staff-facing CRM. It does not establish that a source freeze, redirect,
legacy-route removal, or production data migration has passed its release gates.

## September 22 production checkpoint

The reviewed, reversible legacy staff-write fence is now in `main`, but a
read-only query of production `system_settings` found no fence row. Its effective
state is therefore **off**; Core staff CRM writes remain available. This is not
yet a Dashboard-only cutover.

Separate read-only repeatable-read snapshots found four Core leads, zero Core
clients, notes, or tasks; and four Dashboard leads, one Dashboard client, three
Core-source archive mappings, and two commercial intake receipts. Comparing
SHA-256 digests of Core identifiers with Dashboard mapping/receipt identifiers
in memory showed all four Core leads covered by an archive mapping or intake
receipt, with no uncovered lead. The two receipts point to two distinct native
leads; neither receipts nor lead archive mappings are orphaned. The fourth Core
lead postdates the three-lead preservation batch, so this checkpoint updates the
count but does not claim a cross-database atomic freeze or content equivalence.
No customer payload, source identifier, credential, or connection string was
printed or retained in this document. No production mutation was performed.

The Owner has since authorized retiring the seven suspended test accounts and
deferred mandatory Owner MFA; those decisions supersede the older decision
request below. A September 22 read-only production check found one active
account, zero suspended/unretired accounts, and seven live retirement
tombstones. None of those seven was active or held a live session, capability
grant, or form-notification grant. Recovery behavior remains a separate
controlled acceptance check. The Owner also confirmed receiving lead
notification emails; do not resubmit the controlled QA inquiry.

Both Core and Dashboard pipeline configuration tables have no stored override,
so both systems use the same six stage labels, colors, and order from their
source defaults. The native Owner-only pipeline settings deep link is implemented
on the closeout branch at `/sales/pipeline-settings`; no production settings
migration is currently needed. Recheck both tables immediately before redirect
activation.

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

The September 21 inspection was source-level evidence, not proof of current
production configuration or traffic. Since then, the reversible authenticated
Core staff-write fence has merged to `main`. The September 22 production read
above confirms it is not activated. The temporary import fence remains limited
to its reviewed batch and must not be repurposed as permanent ownership control.

## Released slice: legacy staff-write fence

The current review branch adds a server-side, default-off transition fence for
the authenticated legacy Core staff routes. It is intentionally a reversible
cutover control, not a source-data deletion or a replacement Dashboard writer.

- `GET` and admin-only `PUT`
  `/api/admin/crm/settings/legacy-staff-write-fence` expose a versioned
  `staffWritesFenced` setting. The missing setting means `false`; malformed or
  boundary-mismatched stored state reports `configurationValid: false`, fails
  closed, and still returns a non-sensitive CAS version. An admin can repair a
  bad category/secrecy boundary only through the separately audited, versioned
  `PUT /api/admin/crm/settings/legacy-staff-write-fence/recover` endpoint.
- Changing the setting commits its configuration and an `activity_logs` entry
  atomically. Generic Core settings endpoints cannot set or delete the key.
- When `true`, Core staff create/update/note/task routes for leads and clients,
  plus the legacy pipeline-settings write and its Won conversion path, return
  `409 legacy_staff_crm_writes_fenced` before the CRM mutation. Blocked attempts
  receive an audit event containing only the operation name.
- The fence deliberately does **not** cover `POST /api/crm/leads`, public forms,
  or durable effects. Their Core-to-Dashboard handoff and submission identity
  remain unchanged. The admin control endpoint remains available so an approved
  operator can re-enable staff writes as forward recovery.

The fence is an **admission control**, not a distributed hard-freeze lock: a
request admitted before the setting commit can still complete afterwards. Before
an activation request can set `staffWritesFenced: true`, the admin must submit a
validated operational assertion that staff writes are quiesced, already-admitted
staff writes are drained, and a post-fence reconciliation is planned. This is a
tested gate and audit record, not proof that the operational actions occurred.
The approved activation runbook must therefore quiesce/drain staff writes before
the setting change and independently reconcile the source after it. Do not claim
that this setting alone establishes sole-writer enforcement.

Focused tests cover the default, permission boundary, explicit activation gate,
atomic audit request, blocked-write behavior, forward recovery including a
boundary-mismatch repair, malformed state, generic-setting bypass prevention,
and inbound durable-submission replay. The code is merged and deployed, while
the setting remains absent/default-off. It must remain off until the cutover
runbook and acceptance gates below pass.

## Gates still open

1. **Enforce the chosen staff writer.** Dashboard Sales is the intended staff
   system of record for edits, notes, tasks, Won conversion, and operational
   clients. Public intake and durable effects continue through Core. The
   transition needs an enforceable source-side policy, a bounded fallback,
   audit evidence, and an unambiguous failure mode; a UI-only hide is
   insufficient.
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
5. **Finish account recovery acceptance.** Production now shows seven retired
   accounts, no remaining suspended/unretired account, and no surviving active
   session or grant for a retired account. Confirm the documented recovery path
   with an isolated fixture and preserve the canonical Owner's session and MFA
   enrollment. The Owner deferred required Owner MFA.

## `/admin` consequence and safe sequence

The CRM-related legacy pages cannot yet be retired:

| Legacy page | Candidate native destination | Blocking evidence |
| --- | --- | --- |
| `/admin/crm` | `/sales` | Pipeline, lead/activity/custom-field workflow, exclusive ownership, and cutover acceptance are incomplete. |
| `/admin/crm/clients` | `/clients` | Reviewed Core-to-native client mapping and staff workflow acceptance are incomplete. |
| `/admin/crm/settings` | `/sales/pipeline-settings` (closeout branch) | The native Owner-only editor has a direct destination; recheck Core and Dashboard setting values and verify roles before redirecting old bookmarks. |

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

## Decisions and operational evidence still required

- Dashboard Sales is the Owner-requested future staff CRM. Document and verify
  transitional behavior for each active Core path above, especially public
  intake and durable effects.
- Approve the scope and operator of the source/effects freeze, backup/recovery
  evidence, acceptance workflow, and emergency forward-recovery procedure.
- Review each remaining historical mapping and decide the disposition of fields
  or workflows that do not have native equivalents.
- Complete an isolated account-recovery acceptance check. The seven inactive
  accounts are retired and the Owner deferred mandatory MFA.
- Approve the CRM redirect table only after the CRM and account gates are
  independently accepted.

Until those decisions and evidence exist, the safe posture is to keep both
systems available, preserve the immutable import archive, make no destructive
source changes, and leave `/admin` in place.
