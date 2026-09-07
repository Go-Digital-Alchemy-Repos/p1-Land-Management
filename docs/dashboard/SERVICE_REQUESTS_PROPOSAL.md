# Service-request triage and work-order conversion — decision proposal

Status: **proposed for Project Orchestrator review. This document does not authorize a schema, API, UI, migration, or deployment change.**

## Current boundary

Clients and office roles can create and read property-scoped requests. Client reads omit the internal submitter ID, and creation records `service_request.created` in the same transaction. The existing row has a free-form `status`, no version, no lifecycle history, and no durable link to a generated work order. It therefore cannot safely support staff triage or duplicate-safe conversion.

## Proposed lifecycle and visibility

Use the following operational states: `new`, `triaged`, `scheduled`, `converted`, `closed`, and `cancelled`. The exact client-facing labels are a product decision; clients must never infer dispatch, billing, payment, or completion from a status alone.

- Owner, manager, and dispatch may triage, schedule, close, cancel, and convert. Each state/scope/assignee change includes the current request version and a reason where the change is not an ordinary `new → triaged` progression.
- Office read access stays explicitly role-scoped. Decide whether sales and finance retain the current read-only access before implementation; neither role may change dispatch status or convert work by default.
- Clients can create requests for their accessible properties and read only client-safe fields: request ID, property, description, client-facing status, created/updated time, and an explicitly published linked work reference if one is approved. They never receive submitter IDs, staff assignments, internal reasons, audit events, private work scope, or financial data.
- Crew see work orders assigned to them, not an independent request queue.

## Conversion contract

`POST /service-requests/:id/conversion-preview` is a no-write review of the request snapshot, selected property, draft work scope, prerequisites, schedule and assignment. `POST /service-requests/:id/conversions` records conversion with a client-supplied operation UUID, request version, canonical payload fingerprint and required work-order fields.

Within one transaction, conversion locks the request and parent property, verifies its version/state, creates exactly one work order, writes an immutable conversion receipt, advances the request to `converted`, and writes audit events. Repeating the same operation and payload returns the original receipt; reusing the operation ID with changed input or using a stale version returns `409`. Conversion never posts an invoice, sends a message, publishes material, or marks work complete.

## Proposed persistence and migration

Use the next unclaimed dashboard migration number and additive records only:

| Record | Purpose |
| --- | --- |
| `service_request.version`, `updated_at` | Optimistic concurrency and current lifecycle state. |
| `service_request_event` | Append-only status/scope/assignment history with actor, version, reason and timestamp. |
| `service_request_conversion` | Immutable operation/fingerprint/request/work-order receipt; unique request and unique operation keys prevent duplicate work. |

Existing requests receive a safe initial version and retain their original status. Add new constraints as `NOT VALID`, verify/backfill valid existing values, then validate in a controlled follow-up. Do not remove columns or alter historical descriptions. Application rollback retains the additive records; it must not delete generated work or reopen a request merely to match older code.

## API and contract requirements

Add versioned routes only with Zod validation, OpenAPI, generated client methods, server-side role/property checks, `Cache-Control: no-store` for authenticated responses, and typed error behavior. Existing `GET/POST /requests` remains compatible. Status updates and conversion use dedicated routes rather than overloading create.

## Staged acceptance evidence

- Client/property/crew/office isolation, including direct IDs and list projections.
- Concurrent triage and conversion attempts, stale versions, unchanged retries, changed operation reuse, cancellation-before-conversion, and conversion of an already converted request.
- Parent lifecycle change during conversion, prerequisite/dispatch guard behavior, and audit/event ordering.
- Generated contract/type checks, database migration replay, populated restore, application rollback compatibility, accessible responsive UI, and an invited-client request-to-reviewed-work pilot.

## Decisions requested

1. Confirm the status vocabulary and client-facing labels.
2. Confirm sales/finance read access and whether any client may see a published converted work reference.
3. Confirm that one request may create at most one work order in v1; follow-on work would use a separate request or explicit owner/manager correction.
