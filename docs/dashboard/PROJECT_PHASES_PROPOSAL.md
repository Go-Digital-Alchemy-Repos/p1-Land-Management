# Project phases and progress billing — decision proposal

Status: **proposed for Project Orchestrator review; no schema, route, UI, migration, or deployment is authorized by this document.**

## Decision needed

The approved dashboard scope requires project phases, prerequisites, change orders, deposits, progress billing, and final balances. The current implementation has a minimal `project` record with a JSON `phases` array and has general `billing_draft` records for deposit, progress, and final billing. It cannot identify a phase as the source of a work order or billing draft, preserve phase lifecycle/audit history, or reliably prevent a phase progression from being billed twice. The JSON shape is therefore insufficient as the financial and operational source of truth.

Approve a normalized, additive project-phase model before implementation. Do not treat a checkbox in the existing JSON as a financial authorization, a completed phase, or client-visible completion.

## Proposed records

| Record | Purpose | Key invariants |
| --- | --- | --- |
| `project_phase` | Operational phase for one project, with ordered scope, lifecycle, planned/actual dates, prerequisite state, version and timestamps. | Belongs to one operational project; position is unique within a project; completed/accepted states retain their historical scope. |
| `project_phase_event` | Append-only lifecycle and scope-change history. | Captures actor, prior/current phase version, event type, reason and timestamp. Historical events are never updated or deleted. |
| `project_phase_billing_intent` | Immutable link from an approved phase billing decision to a dashboard billing draft. | One stable client operation ID/fingerprint per intent; links to one phase and draft; does not post or send an invoice. |

Existing `project.phases` remains untouched during the first additive migration. New projects should write the normalized records after a controlled cutover; legacy JSON remains readable for historical display until an owner-approved, reversible backfill plan is reviewed. No destructive conversion or automatic financial inference is proposed.

## Lifecycle and authority proposal

Project state remains distinct from phase state. A phase would use `planned`, `ready`, `in_progress`, `manager_review`, `accepted`, `blocked`, `cancelled`, and `archived` states. The exact names are a contract decision, but the following rules are required:

- Owner and manager create, edit, reorder, unblock, cancel, and accept phases. Every mutation carries the current version and a required reason when changing scope, status, prerequisites, or dates.
- Dispatch reads operational phase status and can link eligible work to a phase; dispatch cannot accept a phase, alter approved scope, or create financial intent.
- Crew see only assigned work instructions and phase information necessary to perform that work. They cannot change a phase lifecycle or amount.
- Finance can read accepted operational evidence and create or review billing intent, but cannot mark operational work accepted.
- Clients receive only explicitly published phase/report material for properties they can access. Client publication never changes phase acceptance or billing status.
- A phase cannot enter `ready` or `in_progress` while required access, equipment, materials, permits, or deposit prerequisites are unmet, unless an owner or manager records an explicit override. A phase cannot be accepted until linked work and required review are resolved.

Project completion requires every non-cancelled phase to be accepted or archived with an owner/manager reason. A cancellation or scope change after a billing intent exists creates a review requirement; it never silently changes a posted invoice, payment, credit, or QuickBooks balance.

## Billing boundary proposal

The dashboard continues to own a draft intent; QuickBooks remains the source of truth for posted invoice numbers, tax, balances, payments, credits, and adjustments. A phase billing-intent operation must:

1. lock the project, phase, estimate and existing related drafts;
2. verify the current phase/financial snapshot, approved estimate cap, deposit and prior progress totals;
3. require an operation UUID plus a canonical payload fingerprint for retry safety;
4. write the draft, intent, versioned receipt and audit event in one transaction; and
5. return a reviewable draft only.

It must not create a QuickBooks invoice, send an invoice, create a payment link, mark anything paid, or publish client material. QuickBooks posting remains a separate, reviewed action. Any later cancellation, scope revision, credit, payment, or provider-customer mismatch invalidates a stale unposted intent and places it in an office review queue.

## Proposed API boundary

Versioned dashboard endpoints should be added only with Zod/OpenAPI/generated-client contracts and mounted authorization tests:

- `GET/POST /projects/:projectId/phases`
- `GET/PATCH /project-phases/:phaseId` with optimistic `version`
- `POST /project-phases/:phaseId/transitions` with target state, version and reason
- `POST /project-phases/:phaseId/publish` for the separate client-visible projection
- `GET/POST /project-phases/:phaseId/billing-intents` for finance/management review and retry-safe draft preparation

Phase work linking should use an additive nullable relationship after choosing whether a work order may belong to one phase or several. The recommended first release is **one optional phase per work order**, because it is enforceable and maps to the current work-order model. Supporting shared work across phases needs a separate allocation and billing decision.

## Migration, rollout, and recovery

Use the next unclaimed dashboard migration number. Add new tables, foreign keys, unique operation keys, indexes and append-only protection without changing or removing current tables or JSON data. Existing application versions must continue reading legacy projects until the approved UI/API cutover; the new application must tolerate projects with no normalized phases.

Deploy web migrations first, then the compatible worker only if it receives a phase-specific background responsibility. Rehearse a populated restore before production. Application rollback retains all additive phase, billing-intent and audit records; it must not delete phase data or reopen bootstrap/account state. A later backfill, if approved, needs its own resumable batch plan, row counts, checksum/reporting, explicit rollback behavior, and production review.

## Acceptance evidence required before pilot

- Role and property isolation, including direct IDs, search, timeline, files and client publication.
- Concurrent phase edits, reordering, stale transition requests, idempotent billing retries and cancellation-after-intent review.
- Prerequisite/override invalidation, linked work review, phase acceptance and partial/final balance caps.
- Deposit/progress/final reconciliation with QuickBooks sandbox, delayed webhooks, partial payment, credit, customer mismatch and retry-safe provider behavior.
- Migration replay and populated backup restoration, application rollback compatibility, accessibility/mobile UI checks, and a one-crew/invited-client service-to-billing pilot.

## Open questions for approval

1. Should a work order link to exactly one phase in v1, as recommended, or should shared work allocation be in scope?
2. Which phase states and acceptance evidence are contractual for P1 service agreements?
3. Does phase-level client publication include financial milestones, or only reviewed operational reports?
4. Which project types need milestone schedules versus manual progress billing before the pilot?
