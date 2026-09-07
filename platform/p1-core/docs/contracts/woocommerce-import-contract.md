# WooCommerce Import Contract

- **Contract ID:** `core.woocommerce-import`
- **Version:** `1.0.0`
- **Status:** accepted for implementation by the Project Orchestrator
- **Pilot:** Better Farms Foundation
- **Authority:** [Client Migration Master Plan](../core-project-plan.md), CM-004

This contract reconciles the two preserved WooCommerce prototypes without merging either branch. It
defines the stable boundary that a planner, durable adapter, command-line runner, reports, and tests must
implement before any client export is applied. It does not authorize use of real client data or a
production cutover.

## 1. Scope and capability gates

The importer is phased. A phase may be enabled only when its source inventory, mapping, validation,
privacy, and reconciliation gates pass. A record from a disabled phase is rejected, not silently ignored.

| Phase | Entities                                                                                              | Default state                                            | Gate                                                                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | categories, simple physical products, default variants, category assignments, remote media references | enabled for synthetic development and isolated rehearsal | catalog inventory confirms no required unsupported product behavior                                                                                     |
| 2     | attributes, options, variations, dimensions, shipping classes, related products, local media copies   | disabled                                                 | variant/SKU/stock combinations and media bytes reconcile                                                                                                |
| 3     | customers and addresses                                                                               | disabled                                                 | Project Owner approves purpose, minimization, duplicate/account-linking policy, access controls, retention, export, and erasure handling                |
| 4     | historical orders, immutable line-item/address snapshots, coupons, taxes, refunds, shipments          | disabled                                                 | Phase 3 gate plus finance-approved status and money mappings; imported history cannot trigger payment, refund, inventory, fulfillment, or email effects |
| 5     | delta import and cutover                                                                              | disabled                                                 | phases required by the pilot pass two clean-target rehearsals and a timed rollback drill                                                                |

Subscriptions, payment instruments, password hashes, downloadable file credentials, gift-card secrets,
private plugin credentials, authentication tokens, and raw gateway payloads are prohibited in every phase.
Unsupported plugins or source fields require an explicit disposition: `mapped`, `excluded-approved`,
`manual-transform`, or `quarantined`. An undispositioned field blocks apply.

## 2. Source envelope

Every input uses this versioned envelope. The raw export remains outside the repository in encrypted,
access-controlled temporary storage.

```json
{
  "contract": "core.woocommerce-import",
  "contractVersion": "1.0.0",
  "source": {
    "system": "woocommerce",
    "storeId": "stable-non-secret-store-identifier",
    "baseUrl": "https://store.example",
    "woocommerceVersion": "x.y.z",
    "wordpressTimezone": "America/New_York",
    "currency": "USD",
    "currencyMinorUnits": 2,
    "exportedAt": "2026-09-03T12:00:00Z",
    "highWaterMark": "source-defined-monotonic-boundary"
  },
  "entities": {
    "categories": [],
    "products": [],
    "customers": [],
    "orders": []
  }
}
```

`storeId`, entity type, and the WooCommerce entity ID form the source identity. IDs are normalized to
non-empty decimal strings. A source ID may never be reassigned to a different target record. The complete
envelope receives a SHA-256 fingerprint over canonical JSON; reports retain the fingerprint, not the raw
payload.

The export must record WooCommerce and plugin versions, currency, minor-unit precision, timezone, export
window, high-water mark, and independently measured counts and totals. Mixed currencies, ambiguous local
timestamps, missing pagination windows, or a changed store identity block apply.

## 3. Canonical planner output

Parsing and mapping are pure operations. They produce a deterministic plan with no target writes:

```ts
interface WooImportPlanV1 {
  contract: "core.woocommerce-import";
  contractVersion: "1.0.0";
  sourceStoreId: string;
  fingerprint: string;
  highWaterMark: string;
  enabledPhases: number[];
  operations: WooImportOperation[];
  issues: WooImportIssue[];
  reconciliation: WooReconciliation;
}
```

Each operation contains `entityType`, `externalId`, a deterministic candidate target ID, dependencies,
the normalized target record, and a hash of the normalized source fields. Issues contain only severity,
stable code, entity type, hashed source reference, field name, and a generic message. Reports and logs must
not contain names, emails, addresses, order notes, raw records, credentials, or payment data.

Apply is blocked by any error, undispositioned field, record from a disabled phase, target ownership
conflict, count or monetary mismatch, or invalid dependency graph. Warnings require a recorded disposition
before the relevant phase can pass its launch gate.

An operator may supply a separate, non-secret disposition schedule for **exactly matched warnings** in a
reviewed dry-run report. The schedule is bound to the source fingerprint and contains only the warning code,
entity, hashed source reference, field, `excluded-approved` disposition, and an approval-record reference.
It cannot approve validation errors, alter mapped values, or match warnings from a different source
fingerprint. The schedule fingerprint and approval reference are retained with a durable rehearsal run and
must match when that run is resumed. Raw source values, names, addresses, credentials, and payment data are
never included in the schedule.

## 4. Target port

The importer depends on a repository port, not Drizzle or global database state:

```ts
interface WooImportRepositoryV1 {
  beginRun(request: BeginWooImportRun): Promise<WooImportRun>;
  inspect(operations: WooImportOperation[]): Promise<TargetInspection>;
  applyBatch(request: ApplyWooImportBatch): Promise<ApplyBatchResult>;
  completeRun(runId: string, reconciliation: WooReconciliation): Promise<void>;
  failRun(runId: string, failure: SanitizedRunFailure): Promise<void>;
  quarantine(records: WooQuarantineRecord[]): Promise<void>;
  rollbackRun(runId: string): Promise<RollbackResult>;
  inspectRun(runId: string): Promise<WooImportRunEvidence>;
}
```

`applyBatch` commits records, relationship changes, mappings, audit entries, and the next checkpoint in
one database transaction. A unique source mapping conflict becomes an idempotent skip only when the
normalized source hash and target identity agree; otherwise it is a blocking ownership conflict.

The durable adapter must not infer ownership from deterministic UUIDs alone. It must persist mappings and
verify them before updating a target record.

## 5. Durable lifecycle models

The implementation will add these additive logical models. Exact table and column names may follow current
schema conventions, but their semantics are part of this contract.

### Import run

- immutable run ID, contract version, source store ID, source fingerprint, high-water mark, and mode;
- status: `planned`, `applying`, `completed`, `failed`, `rollback_pending`, `rolled_back`, or
  `manual_review`;
- enabled phases, operator reference, timestamps, latest checkpoint, aggregate reconciliation, and
  sanitized failure code;
- uniqueness preventing two active apply runs for the same source store and target stack.

### External mapping

- source system, source store ID, entity type, external ID, target type, and target ID;
- first and latest run IDs, normalized source hash, target baseline hash, latest imported timestamp, and
  lifecycle state;
- unique `(source system, source store ID, entity type, external ID)` and unique owned target identity.

### Audit entry

- run, batch, entity type, hashed source reference, target reference, action, prior source hash, next source
  hash, outcome, issue code, and timestamp;
- no raw personal or payment data;
- enough evidence to reconcile and perform dependency-safe rollback.

### Quarantine record

- run, entity type, hashed source reference, reason code, field names, source hash, retry disposition, and
  timestamps;
- raw rejected records stay only in the protected source workspace and are referenced by hash;
- quarantined records are never counted as applied or silently skipped.

## 6. Idempotency, resume, and concurrency

- `runId` identifies one apply attempt. A resume reuses the same run ID and persisted checkpoint.
- A checkpoint advances only in the transaction that commits its batch.
- Replaying a committed batch yields the same mappings and target state without duplicate records or side
  effects.
- A new run of the same fingerprint performs reconciliation and applies zero changes unless a target edit,
  mapping conflict, or incomplete prior run requires review.
- One target stack permits only one active WooCommerce apply or rollback at a time, enforced by the
  database. Process-local locks are insufficient.
- Delta ordering uses source `date_modified_gmt` plus entity ID, or another documented monotonic source
  cursor. Local-time timestamps are never ordering keys.
- Target writes created after the import starts are detected through baseline hashes and cannot be
  overwritten silently.

## 7. Source authority and merchant edits

Source-authoritative fields during rehearsal are name, source descriptions, source publication state,
source price and sale window, tax classification, SKU, source stock policy and quantity, category
assignments, and source media references. A later WooCommerce delta may update these fields only when the
target still matches the last imported baseline.

Target-owned fields include Core-only presentation, editorial additions, internal operational notes,
workflow state, analytics, and records created after cutover. The importer never deletes an unrelated
target record.

When both source and target changed a source-authoritative field since the last successful import, the
record enters `manual_review`. An operator must select source, target, or a reviewed transform. Apply does
not use last-write-wins. After the final source freeze and accepted reconciliation, Core becomes
authoritative; any later source import requires a new approved migration window.

## 8. Entity mapping rules

### Phase 1 catalog

- Categories preserve name, slug, sanitized description, parent relationship, order, active state, and an
  HTTP(S) image reference. Parent cycles and missing parents block the affected records.
- Only simple, physical, non-downloadable products are accepted. Other product types are quarantined until
  their phase is enabled.
- Product description HTML uses the platform allowlist and safe link attributes. Scripts, event handlers,
  embeds, and unsafe URL schemes are removed and reported.
- Money is converted from an exact decimal string to integer minor units using the declared currency
  precision. Floating-point arithmetic, implicit rounding, negative values, and excess precision block the
  record.
- `published` maps to published/active; non-public WooCommerce states remain draft/inactive unless an
  approved status table says otherwise. Unknown states block the record.
- A simple product receives one deterministic default variant. SKU uniqueness is checked across all target
  variants. Duplicate source SKUs are blocking conflicts.
- Stock quantity is imported only when stock management is enabled. Backorder policy maps explicitly; an
  unknown policy blocks the record.
- Media URLs must be HTTP(S). Phase 1 references source media and never claims that bytes were migrated.
  Media download, integrity verification, ownership, and failure thresholds belong to Phase 2.
- Category assignments and imported media ordering are source-authoritative sets. Their replacement must
  remain inside the owning product transaction.

### Customer and historical commerce phases

Customer and order parsers may be developed with synthetic fixtures, but durable apply remains disabled
until the phase gates in section 1 are approved. Passwords are never imported. Account linking cannot rely
on email alone without the approved duplicate and verification policy.

Historical orders use immutable product-name, SKU, unit-price, discount, tax, shipping, address, and total
snapshots. They are marked as imported history and cannot trigger live payment capture, refunds, stock
deduction, fulfillment, or outbound email. Status mappings are finance-approved and preserve distinctions
needed for gross, discount, tax, shipping, refund, and net reconciliation. A whole-order `refunded` flag is
not a substitute for refund records.

## 9. Execution phases

1. **Inventory:** capture source capabilities, plugins, versions, fields, counts, money totals, URL
   inventory, and phase approvals.
2. **Plan:** parse offline, produce the deterministic plan, and disposition every issue.
3. **Inspect:** compare mappings, slugs, SKUs, dependencies, target edits, and existing target ownership.
4. **Dry-run:** persist no target or lifecycle state; emit a sanitized signed evidence report.
5. **Apply rehearsal:** create a run and commit deterministic batches with mappings, audit, and checkpoints.
6. **Reconcile:** independently compare source, plan, and target counts, states, stock, relationships, media,
   and money.
7. **Repeat:** rerun the same fingerprint and then repeat against a clean target. Results must agree.
8. **Rollback rehearsal:** roll back records created by the run in dependency-safe order or restore the
   pre-import backup when ownership has changed.
9. **Final delta and cutover:** requires a separately approved production plan, source freeze, current
   backup, rollback owner/deadline, and all applicable client release gates.

Validate a synthetic or protected envelope offline with:

```bash
npm run migration:woocommerce:validate -- /secure/path/woocommerce-envelope.json \
  --report /secure/path/woocommerce-dry-run-report.json
```

The command writes no database state. A ready report exits `0`; a blocked plan exits `2`. Report files are
created with owner-only permissions and contain aggregate evidence and sanitized issue references only.

When the report has a warning the approved scope intentionally excludes, the owner-approved schedule is
supplied to both the dry-run and matching rehearsal command. It must use the report's exact fingerprint and
hashed issue references:

```json
{
  "contract": "core.woocommerce-import-dispositions",
  "contractVersion": "1.0.0",
  "sourceFingerprint": "<sha256-from-dry-run>",
  "approvalReference": "approved-change-record",
  "entries": [
    {
      "code": "unsupported_field",
      "entity": "product",
      "sourceRef": "product:<hashed-reference>",
      "field": "legacy_plugin_field",
      "disposition": "excluded-approved"
    }
  ]
}
```

```bash
npm run migration:woocommerce:validate -- /secure/path/woocommerce-envelope.json \
  --dispositions /secure/path/approved-dispositions.json \
  --report /secure/path/woocommerce-dry-run-report.json
```

After the offline report has been reviewed, an operator may apply a **synthetic or isolated rehearsal** only
through the explicit durable command below. It rejects cutover mode, production runtimes, and a target-stack
value that does not match `CLIENT_STACK_ID`; it requires the exact planned fingerprint and must never be
pointed at a production target.

```bash
CLIENT_STACK_ID=isolated-rehearsal NODE_ENV=development \
npm run migration:woocommerce:apply -- /secure/path/woocommerce-envelope.json \
  --target-stack isolated-rehearsal \
  --operator approved-operator-reference \
  --mode rehearsal \
  --confirm-fingerprint <sha256-from-dry-run> \
  --dispositions /secure/path/approved-dispositions.json \
  --apply
```

To resume a failed rehearsal, repeat the same command with the original `--target-stack`, source envelope,
and fingerprint plus `--resume-run <run-id>`. The runner accepts only the same failed run, verifies its
contract/source/target/fingerprint/high-water-mark identity, and continues after its committed checkpoint.
It rejects unknown, duplicate, and misplaced arguments so the reviewed command line cannot be silently
changed by a typo or conflicting option.

## 10. Rollback and reconciliation

Rollback deletes only records whose durable mapping was first created by the selected run and whose target
hash still matches the post-import audit hash. Changed targets move the run to `manual_review`; they are not
deleted. Updated pre-existing mapped records require restoration from the audit snapshot or the approved
pre-import backup. Ad hoc SQL deletion is prohibited.

For each enabled phase, source, planned, applied, skipped-existing, quarantined, excluded-approved, and
target counts must balance exactly. Catalog reconciliation includes status, product type, base and sale
price totals, SKU count, managed-stock quantity, backorder policy, category relationships, and media
references. Historical commerce adds orders by status/currency and gross, discount, tax, shipping, refund,
and net totals. Monetary differences must be zero unless finance signs a record-level exclusion schedule.

Every source record must finish as applied, idempotently matched, excluded-approved, or quarantined. A
generic skipped count is insufficient evidence.

## 11. Redirect and media boundary

The importer emits a protected redirect inventory containing old path, proposed target path, entity type,
hashed source reference, expected status, and verification state. It does not mutate DNS, CDN, proxy, or CMS
redirect configuration. Product, category, tag, pagination, account, cart, checkout, order-status, feed,
sitemap, and campaign URLs require explicit disposition. Duplicate destinations, unsafe external targets,
encoding differences, trailing-slash behavior, chains, and loops block redirect acceptance.

## 12. Acceptance evidence

Implementation is accepted only when contract tests prove:

- invalid envelopes, phase violations, unsafe HTML/URLs, money precision errors, unknown statuses, and
  mapping/target conflicts fail closed;
- duplicate, interrupted, resumed, reordered, and concurrent batches cannot duplicate or silently overwrite;
- checkpoints, target records, mappings, and audit entries commit atomically;
- quarantine and reports contain no prohibited or raw personal data;
- target edits produce manual review and rollback preserves changed or unrelated records;
- two clean-target rehearsals and a same-fingerprint replay reconcile to the approved source controls;
- imported historical records produce no payment, refund, stock, fulfillment, or email side effects;
- the restore and rollback procedures meet the approved Better Farms RPO/RTO.

## 13. Prototype disposition

| Prototype behavior                                                                                                                                                                                                              | Decision                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Catalog schema, conservative HTML sanitization, exact minor-unit parsing, category/simple-product mapping, deterministic candidate IDs, slug/SKU/default-variant conflict inspection, remote-media boundary, redirect inventory | accept from `codex/woocommerce-migration-toolkit` as implementation input                                            |
| Repository port, run ID, cursor/resume behavior, mapping uniqueness, atomic batch, sanitized issues, explicit rollback model                                                                                                    | accept from `codex/woocommerce-migration-toolkit-4bfb` as implementation input                                       |
| Direct global database adapter and one transaction for the entire catalog                                                                                                                                                       | replace with the versioned port and durable atomic batches                                                           |
| In-memory repository                                                                                                                                                                                                            | retain for unit tests only                                                                                           |
| Customer matching by normalized email and synthesized guest customers                                                                                                                                                           | reject pending approved identity/account-linking policy                                                              |
| Historical order flattening into manual orders and whole-order refunded status                                                                                                                                                  | reject pending snapshot, refund, finance, and side-effect isolation contracts                                        |
| USD-only hard coding                                                                                                                                                                                                            | replace with declared single-currency metadata and exact configured minor units; multi-currency remains out of scope |
| Deterministic IDs as sole ownership evidence                                                                                                                                                                                    | replace with durable source mappings and target baseline hashes                                                      |

Changes to entity scope, source authority, lifecycle states, identity matching, historical financial mapping,
or rollback semantics require a contract version change and Project Orchestrator review. Enabling customer or
historical order data additionally requires the Project Owner approvals stated in section 1.
