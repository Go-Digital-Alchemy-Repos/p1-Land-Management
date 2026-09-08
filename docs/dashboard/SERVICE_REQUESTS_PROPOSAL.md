# Service-request triage and work-order conversion — decision proposal

Status: **implemented locally as migration 0021 and awaiting integration and deployment.**

## Current boundary

Clients and office roles can create and read property-scoped requests. Client reads omit the internal submitter ID, and creation records `service_request.created` in the same transaction. The existing row has a free-form `status`, no version, no lifecycle history, and no durable link to a generated work order. It therefore cannot safely support staff triage or duplicate-safe conversion.

## Proposed lifecycle and visibility

The implementation uses the operational states `new`, `triaged`, `scheduled`, `converted`, `closed`, and `cancelled`. Client projections use `received`, `under_review`, `service_planning`, `work_planning`, `closed`, and `cancelled`; they do not disclose a crew, work completion, billing, or payment state.

- Owner, manager, and dispatch may triage, mark service-planning, close, cancel, and convert. Every state change includes the current request version and a reason. `converted` is set only by the idempotent conversion transaction.
- Owner, manager, dispatch, sales, and finance retain read access. Sales and finance cannot change lifecycle state or convert work.
- Clients can create requests for their accessible properties and read only client-safe fields: request ID, property, description, client-facing status, created/updated time, and an explicitly published linked work reference if one is approved. They never receive submitter IDs, staff assignments, internal reasons, audit events, private work scope, or financial data.
- Crew see work orders assigned to them, not an independent request queue.

## Conversion contract

`POST /service-requests/:id/conversion-preview` is a no-write review of the request snapshot and a selected draft work scope/checklist/prerequisites. `POST /service-requests/:id/conversions` records conversion with a client-supplied operation UUID, request version, canonical payload fingerprint and required draft-work fields.

Within one transaction, conversion locks the request and parent property, verifies its version/state, creates exactly one work order, writes an immutable conversion receipt, advances the request to `converted`, and writes audit events. Repeating the same operation and payload returns the original receipt; reusing the operation ID with changed input or using a stale version returns `409`. The generated work order is always `draft`, unassigned, unscheduled, and unpublished. Conversion never posts an invoice, sends a message, creates an outbox/provider action, publishes material, or marks work complete.

## Proposed persistence and migration

Use the next unclaimed dashboard migration number and additive records only:

| Record | Purpose |
| --- | --- |
| `service_request.version`, `updated_at` | Optimistic concurrency and current lifecycle state. |
| `service_request_event` | Append-only status/scope/assignment history with actor, version, reason and timestamp. |
| `service_request_conversion` | Immutable operation/fingerprint/request/work-order receipt; unique request and unique operation keys prevent duplicate work. |

Existing requests receive a safe initial version and retain their original status. The status constraint is `NOT VALID`: it applies to new and updated rows without rejecting historical rows. Historic rows with a nonstandard status remain readable but cannot be transitioned through the new workflow until an owner-directed data correction is separately planned. No columns or descriptions are removed. Application rollback retains additive records; it must not delete generated work or reopen a request merely to match older code.

## API and contract requirements

The implemented versioned routes use Zod validation, server-side role/property checks, typed errors, and the dashboard-wide `Cache-Control: no-store` policy. Existing `GET/POST /requests` remains compatible; client status values are now safe labels and each new request writes an initial append-only event. Status updates and conversion use dedicated routes rather than overloading create. Full OpenAPI/generated-client coverage remains a platform-wide follow-up.

## Staged acceptance evidence

- Client/property/crew/office isolation, including direct IDs and list projections.
- Concurrent triage and conversion attempts, stale versions, unchanged retries, changed operation reuse, cancellation-before-conversion, and conversion of an already converted request.
- Parent lifecycle change during conversion, prerequisite/dispatch guard behavior, and audit/event ordering.
- Generated contract/type checks, database migration replay, populated restore, application rollback compatibility, accessible responsive UI, and an invited-client request-to-reviewed-work pilot.

## Integration and release notes

The implementation is additive and has passed disposable-PostgreSQL migration replay plus HTTP role, client isolation, stale-version, conversion-retry, cancellation, append-only, and no-provider-action tests. It is not deployed. Integration must preserve the migration order, review the versioned wire contract with the shared OpenAPI backlog, and exercise the flow with invited pilot users before release.
