# Commercial assessment baseline — COM-05 implementation contract

Status: **implemented on the integration branch, September 8, 2026; pending
staged release verification.** This bounded commercial workflow increment
follows the deployed intake and prospect-context slice. It creates a private,
versioned assessment baseline;
it does not confirm an appointment, assess a fee, publish a report, create a
proposal, onboard a customer, assign work, or grant portal access.

Parent requirements: [commercial initiative](../initiatives/commercial-industrial-sales.md),
[master plan](../MASTER_PLAN.md), and [prospect lifecycle](p1-commercial-prospect-lifecycle.md).

## Why a separate record is needed

`assessment_slot` is an operational scheduling primitive. It does not record
what staff observed, what P1 recommends, who reviewed it, or what was approved
for release. A commercial inquiry and its linked prospect property must remain
private to sales until a later explicit handoff. Reusing an operational
inspection, estimate, or work order would bypass those boundaries and would
incorrectly imply an appointment, client relationship, approved scope, or
service commitment.

The baseline creates the first durable bridge in this lifecycle:

`commercial inquiry → qualified context → private assessment baseline → reviewed findings → later proposal/onboarding`

Every later stage remains an explicit action. A baseline is not a proposal,
engineering report, compliance certification, site-security record, or
customer-visible document.

## Initial release boundary

Only owner, manager, and sales users may create, read, revise, review, or
archive a commercial baseline. The record is scoped to a commercial inquiry
and may reference its linked prospect or operational property. It must never
appear in shared property lists, maps, client/crew views, dispatch queues,
financial workflows, exports, search, notifications, or the public CMS.

The initial release has no attachment upload, customer/third-party sharing,
calendar booking, dispatch assignment, fee, quote, agreement, work order,
recurring service, invoice, QuickBooks, outbound email/SMS, identity, or access
side effect. Existing `assessment_slot` APIs continue to require an
operational property and are not broadened by this work.

## Data ownership and additive schema

Allocate the next dashboard migration number only during integration; do not
reuse an already reserved migration. The migration is additive and leaves
existing `lead`, `property`, `assessment_slot`, `inspection`, `estimate`, and
operational history contracts unchanged.

### `commercial_assessment`

One assessment represents one staff-managed baseline for one commercial lead.

| Field | Requirement |
| --- | --- |
| `id` | Server-generated UUID. A separate caller-supplied `operationId` is persisted for idempotent retry receipts. |
| `lead_id` | Required FK to a `lead` whose `inquiry_type` is `commercial_site_assessment`. |
| `property_id` | Nullable FK to the lead's exact linked property. The database/service rejects a different property UUID. |
| `status` | `draft`, `reviewed`, or `archived`; no implicit transition to an operational status. |
| `title` | Required bounded staff-facing description, not public marketing copy. |
| `scope_note` | Optional bounded assessment scope. It is not an estimate scope or agreement. |
| `version` | Starts at 1 and changes on every mutable update or review transition. |
| `created_by`, `reviewed_by`, `reviewed_at`, timestamps | Preserve actor/time evidence. `reviewed_*` remains null until explicit review. |

Use a unique `lead_id` plus a non-archived status if the product allows only
one active baseline per inquiry. If staff need parallel or repeat baselines,
require an explicit parent assessment/supersession design rather than silently
reusing a title or overwriting history.

### Findings and recommendations

Store findings and recommendations as normalized child records, not a free-text
lead payload or opaque JSON blob.

`commercial_assessment_finding` includes assessment ID, UUID, ordered
position, bounded category (`grounds_vegetation`, `stormwater_drainage`,
`grading_erosion`, `tree_land`, `roads_access`, `emergency_corrective`,
`recurring_site_management`, `other`), bounded factual observation, optional
condition/priority and timestamps. A finding does not create an issue
or work order.

`commercial_assessment_recommendation` includes assessment ID, stable UUID,
optional finding ID, ordered position, bounded recommended action, optional
priority and a status limited to `draft` or `reviewed`. It records a suggested
next step, never accepted contract scope, schedule, price, or authority.

On review, write an immutable `commercial_assessment_review` snapshot that
contains the exact baseline, ordered findings/recommendations, review actor,
source assessment version, and SHA-256 fingerprint. A later draft edit creates
a new current version; it never modifies a prior reviewed snapshot. Snapshots
are private and need an explicit later publication contract before any
client-facing use.

## Authorization and transaction rules

1. Resolve the commercial lead inside the write transaction and require
   `inquiry_type='commercial_site_assessment'`. Missing/other leads return 404.
2. If a property is supplied, lock it in the same transaction and require that
   it equals `lead.property_id`, is not archived, and is not inferred from a
   caller-supplied organization/contact. A prospect property remains sales-only.
3. Use an operation UUID and server-side request fingerprint for creation. An
   identical retry returns the original receipt; changed actor, lead, property,
   or body returns 409 without writing another baseline.
4. Updates and review require `expectedVersion`; stale writers receive 409 and
   retain no partial child changes. Apply parent lock, replace the complete
   bounded ordered draft collections, then write the audit/review receipt in
   the same transaction.
5. On every mutation, add an audit event with IDs, version transition, action,
   and summary only. Do not put contact details, raw intake, security details,
   or full observations in logs.
6. Do not rely on UI filtering. Legacy operational readers must continue to
   exclude prospect data; direct-ID access by dispatch, finance, crew, client,
   or unauthenticated callers returns 404 or 403 according to existing policy.

## API and dashboard contract

Mount dedicated dashboard routes under `/api/v1/commercial-inquiries/:leadId`.
Generate the OpenAPI client only after the routes and DTOs are final.

| Endpoint | Contract |
| --- | --- |
| `GET /assessment-baselines` | Sales-role-only list of minimum safe DTOs for that inquiry. No raw intake/contact channels unless already available through the commercial detail endpoint. |
| `POST /assessment-baselines` | Stable `{operationId, expectedLeadVersion, propertyId?, title, scopeNote?}`. Creates one private draft and returns its receipt. |
| `GET /assessment-baselines/:id` | Sales-role-only detail with current version, findings, recommendations, review metadata, and no public-report URL. |
| `PUT /assessment-baselines/:id` | CAS update of title/scope/findings/recommendations. The request submits the complete bounded ordered collections so deletion is explicit and auditable. |
| `POST /assessment-baselines/:id/review` | CAS transition from draft to reviewed and creates an immutable review snapshot. A no-op or duplicate review is an explicit conflict/replay receipt, never silent re-review. |
| `POST /assessment-baselines/:id/archive` | CAS archive with bounded reason. Archiving never deletes review history. |

The Commercial Inbox now includes a sales-only assessment panel alongside the
existing intake, follow-up, and prospect-context panels. It exposes
none/draft/reviewed/archived state, bounded finding and recommendation editing,
explicit review/archive actions, and clear language that a review does not book
a property walk or approve work. It preserves the original intake, assigned
owner, next action, and conflict-safe follow-up behavior.

## Required evidence before promotion

- Migration replay from the current production-compatible ledger and an isolated
  restore rehearsal; no destructive rollback.
- Role matrix for owner/manager/sales allow and dispatch/finance/crew/client/
  anonymous denial, including direct assessment, finding, recommendation, and
  review IDs.
- One commercial lead with a prospect property and one with an operational
  linked property; verify exact-property binding and no leakage through legacy
  property, schedule, inspection, estimate, work, billing, file, map, or
  notification routes.
- Create replay, changed-operation conflict, stale update/review/archive,
  finding/recommendation ordering, immutable review snapshot, and audit tests.
- Browser checks for labels, keyboard flow, retained draft after 409, clear
  review status, and no raw payload exposure. Run a production build and route
  security checks before staging.
- Fresh isolated database backup, staging health/auth-boundary checks, synthetic
  fixture cleanup, exact-source deployment receipt, and a documented compatible
  rollback path that retains created baselines.

## Later decisions deliberately excluded

The owner must separately approve assessment fee/payer terms, appointment
confirmation and dispatch projection, approved report audience/distribution,
attachments/photos/maps and retention/quarantine, proposal authority and
external acceptance, customer onboarding, recurring-service/work-order handoff,
and any marketing use of assessment content. Those decisions cannot be inferred
from a submitted form, contact email, role title, or reviewed baseline.
