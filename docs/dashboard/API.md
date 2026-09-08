# API contracts

`/api/v1` endpoints use verified Better Auth sessions. Browser cookie mutations require the configured dashboard Origin. Future iOS/Android clients use the same account's signed bearer session token in `Authorization`; a valid bearer request is allowed without a browser Origin and is still subject to the same verified-email, MFA, role and property authorization checks. Errors use HTTP status and an error message; callers must preserve pending operations on failure.

`lib/api-spec/dashboard.openapi.json` specifies selected shared dashboard contracts, including setup/identity, client and property records, client contacts, field work, assessment availability and booking, integration health, property reads, sales, project and expense records, project-phase and service-request lifecycles, scheduling, commercial intake, agreement work and binary photos. `pnpm --filter @workspace/api-spec codegen:dashboard` generates the isolated dashboard fetch client. The UI consumes its field methods. Other routes currently validate with Zod at the server and still require full OpenAPI coverage.

| Domain                | Routes beneath /api/v1                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Initialization/access | /setup, /setup/complete, /me, /staff, /account-mfa-policies, /account-mfa-policies/:id, /invitations, /invitations/accept                    |
| Operations            | /clients, /properties, /properties/:id/areas, /projects, /work-orders, /work-orders/:id/status, /work-orders/:id/publish, /field/sync                |

`GET/POST /clients`, `POST /clients/:id`, and `POST /properties` are generated contracts. Office client updates require the current version and atomically maintain the primary contact. Client accounts receive a minimized client list; crew have no client-record access. A primary-contact onboarding request requires address and phone and returns its created contact ID; neither client nor property creation creates an invitation, schedule, work order, billing record, or provider action.

The generated work-order contract covers office planning, versioned status transitions, and manager publication alongside the existing read, readiness, rescheduling, and field-sync methods. Only owner, manager, or dispatch can create or transition work; an override reason requires owner or manager authority. Publication requires a reviewed work order and is owner/manager-only. It publishes only eligible non-conflicting notes, checklist entries, and completion events; it does not publish field issues, alter billing, or record payment.

`POST /properties/:id` is an office-only, versioned edit of an operational unarchived property. It requires `{name,address,acreage:null|number,accessInstructions?,version}` and returns `409` for stale or unavailable records. `POST /projects/:id` is owner/manager-only and requires `{name,scope,expectedVersion}`. It atomically advances the project version and returns `409` on a stale or unavailable record. Neither route changes client access, phase state, schedules, work, billing, publication, providers, or payments.
| Project phases        | /projects/:id/phases, /project-phases/:id, /project-phases/:id/transitions, /project-phases/:id/publish, history and billing-intent routes     |
| Service requests      | /requests, /service-requests, /service-requests/:id, transitions, history, conversion preview and conversion receipt routes                    |
| Scheduling            | /assessment-slots, /assessment-slots/:id/book, /recurring-services; operations.ts owns rescheduling/pause routes                             |

The generated recurring-schedule contract covers office creation and future-generation pause/resume. Owner, manager, and dispatch can configure weekly or monthly cadence, interval, America/New_York local time, assigned crew, and independent fixed-monthly or per-visit billing metadata. The worker remains responsible for creating occurrences; pausing never rewrites existing work orders, sends notifications, or alters billing records.
| Sales                 | /leads, /estimates, estimate decision/revision and lead conversion routes in sales.ts                                                        |
| Financial             | /expenses, /billing, /billing/:id/post, /quickbooks/connect, /quickbooks/callback, /quickbooks/import-preview, /quickbooks/import, /quickbooks/invoices |
| Media                 | POST /files/:id with image body, x-p1-property, x-p1-work, x-p1-classification; protected content/publication routes in files.ts             |
| Communications        | Notification, delivery and consent routes in notifications.ts                                                                                |

## Client onboarding and maintenance

Office roles (owner, manager, dispatch, sales and finance) create a client with `POST /clients`. The dashboard onboarding flow submits a business name, address and phone plus a required primary contact: first name, last name, email, position and phone. The server creates the client and primary contact in one transaction and records audit events for both, so a partial client is never retained when contact creation fails.

`GET /clients` exposes the business details and the active primary contact only to office roles; client-role responses remain minimized to their own ID and name. `POST /clients/:id` updates the business and primary contact together. It requires the client `version`; stale submissions return 409 rather than overwriting another user's edit. When an older client has no primary contact, this edit creates one. Additional site, billing and other contacts remain managed through `GET`/`POST /clients/:clientId/contacts` and `POST /clients/:clientId/contacts/:id`, all with the same office-role check and contact version handling.

Migration 0015 adds the client version and primary-contact detail columns without removing existing data. The legacy minimal client-create payload remains supported for compatibility with existing internal integrations, but the dashboard uses the complete onboarding payload.

Billing creation requires `operationId` (UUID), `propertyId`, `estimateId`, `title`, integer `amountCents`, and `kind` (service/deposit/progress/final). Reuse the same operation ID on an identical retry. Different payload reuse returns 409; a new financial intent requires a new operation ID. The transaction stores actor, canonical validated-payload fingerprint and resulting draft ID. This does not automatically send an invoice or collect payment.

## Project phases (deployed migration 0020)

`POST /projects/:projectId/phases` requires owner or manager and creates an additive normalized phase while preserving the legacy JSON `project.phases` value. An explicit occupied `position` returns409. Owner/manager edits use `PATCH /project-phases/:id` with `expectedVersion` and a required reason. Terminal accepted, cancelled and archived records reject edits.

`POST /project-phases/:id/transitions` requires the current version, target state and a reason. The server validates lifecycle transitions, blocks ready/in-progress states with unmet prerequisites unless an explicit override reason is recorded, and requires all linked work to be reviewed/cancelled/skipped before acceptance. `GET /project-phases/:id/history` returns the append-only event history only to office roles. Client reads are restricted to explicitly published projections; crew reads are restricted to phases with active assigned work.

`POST /project-phases/:id/publish` is an owner/manager action for manager-review or accepted work and records a client-safe summary only. `POST /project-phases/:id/billing-intents` is owner/manager/finance-only. It requires an accepted phase, approved estimate, current phase version and UUID operation ID. The server stores one immutable intent and one draft billing record on an identical retry, enforces the estimate cap, and returns409 for a changed operation replay. It never posts to QuickBooks, sends an invoice, creates a payment link, records a payment, or publishes crew material.

The phase list/detail, create/update, transition, publication, history, and billing-intent endpoints are generated from the shared OpenAPI contract. The generated types keep client publications and crew assignment views minimized; office-only event history and billing-intent records remain server-authorized.

## Project and expense records

`GET/POST /projects` is generated from the shared contract. Owner, manager, dispatch, and finance can list operational-property projects; only owner and manager can create one. A creation writes the legacy project summary and optional legacy phase list only. It does not create normalized project phases, dispatch work, publish client material, create billing, post to QuickBooks, or record a payment.

`GET/POST /expenses` is generated from the shared contract. Owner, manager, and finance can list and record expenses for operational properties. It is an operational job-costing record; QuickBooks remains the accounting system of record. The database returns `amount_cents` as a base-10 string because the source column is PostgreSQL `bigint`; request `amountCents` remains a positive integer. These endpoints do not create a QuickBooks entry, post accounting changes, create a payment link, or record a payment.

## Sales lifecycle

The generated sales contract covers office lead listing and creation, eligible lead conversion, draft estimate creation, staff sending, client approval/decline, revisions, and change orders. The established `listAgreementEstimates` read method remains the shared typed reader for `/estimates`, so agreement callers retain their existing operation name and response model.

Lead conversion makes a client/property linkage only. Estimate creation, revision, and change order creation do not send an estimate, schedule work, dispatch a crew, publish client material, post a QuickBooks invoice, create a payment link, or record a payment. An estimate approval remains a current-revision decision by an authorized client for an accessible property; office roles may only move a draft to `sent`.

## Client service requests (deployed migration 0021)

`GET/POST /requests` remain compatible. A client list response has client-safe status labels and no submitting-user identity; office readers retain the operational details. Creation requires a client-accessible or operational property and writes the first append-only lifecycle event in the same transaction.

`GET /service-requests` and `GET /service-requests/:id` provide the normalized lifecycle read model. Clients can read only properties granted to their account and receive a minimized projection. Crew have no independent request queue. Owner, manager, dispatch, sales and finance can read the operational projection; only owner, manager and dispatch can mutate it.

`POST /service-requests/:id/transitions` requires `{expectedVersion,status,reason}`. It accepts only `triaged`, `scheduled`, `closed`, or `cancelled` targets, locks the request, rejects stale or invalid transitions with409, advances the version, and appends an event. `GET /service-requests/:id/history` is office-only and reads append-only events.

`POST /service-requests/:id/conversion-preview` writes nothing. `POST /service-requests/:id/conversions` requires `{operationId,expectedRequestVersion,title,scope,checklist,prerequisites}`. It permits only triaged or service-planning requests, records a stable fingerprint and one receipt, and returns that receipt on an identical retry; changed reuse, stale state, cancellation and a second operation return409. The work order is always an unassigned, unscheduled, unpublished `draft`. This route never invokes QuickBooks, notifications, payments, files, publication or outbox actions.

The migration and public health/authentication boundaries are production-verified. The lifecycle reads, transitions, history, conversion preview and idempotent draft conversion are generated from the shared OpenAPI contract; broader office-route coverage, invited-client workflow acceptance and the one-crew pilot remain open.

## Inspection report publication

`GET /inspections` is available to owner, manager, dispatch, and client accounts. Office roles receive operational inspections for active properties. A client receives only explicitly published inspections belonging to a client-accessible operational property; its response omits the submitting staff user ID. `POST /inspections/:id/publish` requires owner or manager, locks the active-property inspection, and records `inspection.published` in audit history the first time it becomes client-visible. Repeating publication is safe and does not create another audit event. Publishing does not alter a work order, file, invoice, payment, notification, or underlying property condition data.

`GET /properties/:id/timeline` combines the latest 200 field events and inspection reports in chronological order. Clients see inspection entries only after explicit publication; crew still see only their assigned field work and do not receive inspection entries. Timeline inspection payloads retain report findings and are a historical view, not an inferred property-health score.

## Cancellation-review implementation candidate (unmerged)

The isolated agreement correction candidate extends the generated OpenAPI contract with `GET /agreement-charges/:id/review`, `POST /agreement-charges/:id/review-preview`, `POST /agreement-charges/:id/reviews`, `GET /agreement-charges/:id/reviews`, and `GET /service-agreements/:id/charges`. They require an owner, manager or finance actor and always return `Cache-Control: no-store`. Preview writes nothing. The record operation requires a UUID operation ID and returns a historical receipt on an identical retry; a changed reuse or stale snapshot returns 409.

The server builds and hashes the cancellation, charge and full billing-draft snapshot. `keep_due` is valid only for that exact snapshot; `correction_required` is sticky. Neither result posts, changes the invoice amount, creates a credit, releases an approved cap, sends an invoice or records a payment. See [AGREEMENT_CORRECTION_PROPOSAL.md](AGREEMENT_CORRECTION_PROPOSAL.md) for the precise contract. This candidate is not deployed.

Field submissions require unique operation IDs, target work order, base version, captured timestamp, kind and validated payload. Accepted acknowledgments permit local removal; conflicts remain for review. Reassignment/authorization rejection also leaves the device copy intact. File uploads use their stable operation UUID and immutable content-derived object keys.

## Commercial inquiry contract (implemented and staging accepted)

Reviewed backend checkpoint66338b0 adds migration0010 and separate raw-body service ingress. Public browsers continue submitting once to Core. The receiver validates the versioned contract, HMAC signature, source/submission identity, fingerprint and bounded payload before durable receipt; browser-authenticated or Origin-bearing ingress is rejected. Exact wire contract and sender retry rules are canonical in `platform/p1-core/docs/contracts/p1-commercial-handoff.md`. No receipt automatically provisions client identities, portal access, properties or QuickBooks records.

Staff endpoints under `/api/v1` require owner, manager or sales:

- `GET /commercial-inquiries`: `{items,nextCursor}`, default50/max200. Optional `status`, `ownerId` (user ID or `unassigned`) and `overdue=true`. Cursor is opaque and bound to filters; reset it whenever filters change. Ordering is created_at DESC/id DESC with microsecond precision.
- `GET /commercial-inquiries/:id`: full lead detail plus submission_id, received_at and raw_intake. Raw intake is untrusted business content and must never be interpreted as HTML or instructions.
- `PATCH /commercial-inquiries/:id/follow-up`: `{expectedVersion,ownerId:null|string,nextAction,nextActionDueAt:null|ISO,status}`. Status is new/contacted/qualified/proposal/won/lost. Next action is trimmed1–2000 characters. Assign only active owner/manager/sales users. A stale version returns409; success advances version and audit history. Re-fetch detail and first page because the result omits receipt metadata.

The legacy lead list filters commercial inquiries out for dispatch/finance, and operational conversion advances the same optimistic version. See COMMERCIAL_INBOX.md for UI behavior and regression steps. Commercial and schedule generated contracts are implemented in883de4e and pending review/release; remaining office routes still require coverage. The implemented service schemas remain authoritative for current wire validation.

## Assessment availability (deployed checkpoint4079996)

`GET /assessment-availability` returns `{config,blackouts,timeZone}`. `POST /assessment-availability` requires `{version,durationMinutes,bufferBefore,bufferAfter,windows:[{day,start,end}]}`; weekday 0 is Sunday and times are HH:mm in America/New_York. Duration 15–240 minutes and buffers 0–120 minutes; overlapping windows or windows shorter than duration+buffers fail 400. Current version required; stale 409. Rules retire only future, unbooked, generated slots. Booked and manually created appointments remain.

`POST /assessment-availability/generate` takes `{from,through}` ISO dates, inclusive 1–90 days, and returns `{created}`. Generation is explicit after saving rules; retries preserve existing slots. Appointment and travel occupancy must fit the configured window. Nonexistent/cross-transition local appointment times are skipped; local 9am stays 9am as UTC offset changes.

`POST /assessment-availability/blackouts` accepts UTC `{startsAt,endsAt,reason}`; `/assessment-availability/blackouts/:id/archive` removes a blackout through archival. A blackout overlapping a confirmed appointment or its buffers fails 409. Availability reads exclude blackouts; booking checks the same condition transactionally. The office form clearly labels blackout entry with the device timezone; weekly windows always use New York.

All availability management routes require owner/manager/dispatch on the server. Client booking still requires property access. Config, generation, booking, manual slots and blackout mutations share the calendar advisory transaction lock; all mutations are audited. Manual availability may reuse a retired unbooked start but never overwrite a booking. Migration 0009 is additive; application rollback can retain the new columns/tables.

Seven-test combined suite plus migration replay passed. Assessment coverage includes six-role management endpoint matrix, repeated generation, spring offset change, stale config, retained bookings, blackout travel buffers, booking/blackout race, and retired-slot reoffer. Browser fixture of the real component exercised duration saving, generation and blackout creation. Physical-device and live authenticated acceptance remain outstanding.

## Date-range scheduling (implemented locally; deployment pending)

`GET /schedule?from=YYYY-MM-DD&through=YYYY-MM-DD` returns `{items,nextCursor}` in100-row pages for up to32inclusive New York calendar days. Follow `cursor` until null. UTC cursor timestamps preserve PostgreSQL microseconds so equal-time appointments cannot repeat or disappear at page boundaries. `unscheduled=true` pages the office backlog separately; clients cannot use that mode. Client/crew row isolation matches `/work-orders`, and client responses omit internal scope, assignments and versions.

`POST /work-orders/:id/reschedule` accepts `{scheduledAt,assignedTo?,version,reason}`. Omitted assignment preserves the current person; explicit null unassigns. Only owner/manager/dispatch can edit. The work row is locked, current version required, and only draft/scheduled/delayed jobs can move. Non-client active staff are validated with a row lock. The change increments version and audits reason and before/after values; recurrence identifiers and occurrence date are not changed. Started/completed/closed work fails409. This does not implement crew duration/capacity conflict detection.

The calendar loads all pages for the chosen date range and the authorized unscheduled backlog, displays load/retry errors, and allows eligible office users to edit a selected visit. It stops with an explicit error after100pages rather than silently truncating. Datetime editing clearly uses the device timezone; calendar grouping uses New York. Browser fixture verified moving a visit to the next day at9am and clearing its assignment. Tests cover506appointments with identical microsecond timestamps, client/crew projections and route isolation, competing edits, invalid client assignment, occurrence preservation and started-work rejection.

Scheduling review follow-up: `GET /work-orders/:id` authorizes the same client/crew boundary and returns the same safe client projection. Calendar job navigation fetches this detail instead of depending on the legacy list; the selected job is re-fetched during refresh and cleared on sign-out. Isolation tests traverse every page and assert the exact authorized505-record set for both client and crew. A full-app synthetic browser fixture with an empty legacy list verified calendar → detail card → field-entry dialog for a separately loaded job.

### Shared identity contract for mobile

`getDashboardMe` and `DashboardMe` are generated from `/api/v1/me` in the dashboard OpenAPI contract. A verified session may return `role: null` when its business profile is missing or inactive. `twoFactorEnabled` is optional and nullable because the handler forwards the identity provider value without normalization; consumers must compare it with `true`. `mfaRequired` reports whether the current session is blocked by its configured policy; `ownerMfaRequired` is its deprecated compatibility alias. Reading this endpoint does not create session assurance or authorize operational data access.

`listAccountMfaPolicies` and `updateAccountMfaPolicy` are owner-only generated contracts. The list includes all active account roles, including clients, while `/staff` remains role-minimized for its existing office readers. The update and its audit record share one transaction. If an owner requires their own unassured current session, the client must re-read `/me` and show enrollment immediately.

`listDashboardProperties`, `getPropertyTimeline`, and `listPropertyFiles` share the existing authorized read projections with native clients. Internal property fields are optional because they are omitted for clients; acreage is a nullable PostgreSQL numeric string. Timeline reads contain the latest 200 events and retain historical JSON payloads. File metadata omits object keys and bucket URLs. These endpoints remain online snapshots rather than a complete synchronization feed.

`listPropertyAreas` and `createPropertyArea` are generated contracts for `GET/POST /properties/:id/areas`. The read requires server-side access to an operational property: office roles can read it, clients need their account grant, and crew need currently assigned active work. Creation is owner/manager/dispatch-only and requires an operational property with a client. Area acreage returns as a nullable PostgreSQL numeric string; creation accepts a nonnegative number. These routes only store or read property-area records: they do not create assets, schedule or dispatch work, publish material, create billing, change QuickBooks, create a payment link, or record payment.

### Binary photo transport

`uploadFieldPhoto(id, blob, headers, options)` declares required `x-p1-property` and `x-p1-work` headers and optional classification from OpenAPI. Set the Blob MIME or an explicit supported Content-Type to `image/jpeg`, `image/png`, or `image/webp`. The generated transport passes the original Blob directly, preserving supplied `Headers` (including native authorization) and keeping typed target headers authoritative. `getPrivateFileContent` returns an authenticated Blob, never a bucket URL. Device-level file handling still requires native acceptance.

Orval 8.9.1 incorrectly serializes binary image requests using JSON.stringify. The scoped `fix-dashboard-binary.mjs` generation hook corrects only this operation after asserting the expected generator shape. Generation fails when that shape changes, requiring review rather than silently shipping corrupted uploads. Run dashboard code generation through its configured hook and the shared transport regression test after generator changes. Do not hand-edit generated models.
