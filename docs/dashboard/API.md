# API contracts

`/api/v1` endpoints use verified Better Auth sessions. Browser cookie mutations require the configured dashboard Origin. Future iOS/Android clients use the same account's signed bearer session token in `Authorization`; a valid bearer request is allowed without a browser Origin and is still subject to the same verified-email, MFA, role and property authorization checks. Errors use HTTP status and an error message; callers must preserve pending operations on failure.

`lib/api-spec/dashboard.openapi.json` currently specifies setup status, work-order reads and field synchronization. `pnpm --filter @workspace/api-spec codegen:dashboard` generates the isolated dashboard fetch client. The UI consumes its field methods. Other routes currently validate with Zod at the server and still require full OpenAPI coverage.

| Domain                | Routes beneath /api/v1                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Initialization/access | /setup, /setup/complete, /me, /staff, /invitations, /invitations/accept                                                                      |
| Operations            | /clients, /properties, /properties/:id/timeline, /work-orders, /work-orders/:id/status, /work-orders/:id/publish, /field/sync                |
| Scheduling            | /assessment-slots, /assessment-slots/:id/book, /recurring-services; operations.ts owns rescheduling/pause routes                             |
| Sales                 | /leads, /estimates, estimate decision/revision and lead conversion routes in sales.ts                                                        |
| Financial             | /billing, /billing/:id/post, /quickbooks/connect, /quickbooks/callback, /quickbooks/import-preview, /quickbooks/import, /quickbooks/invoices |
| Media                 | POST /files/:id with image body, x-p1-property, x-p1-work, x-p1-classification; protected content/publication routes in files.ts             |
| Communications        | Notification, delivery and consent routes in notifications.ts                                                                                |

Billing creation requires `operationId` (UUID), `propertyId`, `estimateId`, `title`, integer `amountCents`, and `kind` (service/deposit/progress/final). Reuse the same operation ID on an identical retry. Different payload reuse returns 409; a new financial intent requires a new operation ID. The transaction stores actor, canonical validated-payload fingerprint and resulting draft ID. This does not automatically send an invoice or collect payment.

Field submissions require unique operation IDs, target work order, base version, captured timestamp, kind and validated payload. Accepted acknowledgments permit local removal; conflicts remain for review. Reassignment/authorization rejection also leaves the device copy intact. File uploads use their stable operation UUID and immutable content-derived object keys.

## Commercial inquiry contract (implemented, awaiting staging acceptance)

Reviewed backend checkpoint66338b0 adds migration0010 and separate raw-body service ingress. Public browsers continue submitting once to Core. The receiver validates the versioned contract, HMAC signature, source/submission identity, fingerprint and bounded payload before durable receipt; browser-authenticated or Origin-bearing ingress is rejected. Exact wire contract and sender retry rules are canonical in `platform/p1-core/docs/contracts/p1-commercial-handoff.md`. No receipt automatically provisions client identities, portal access, properties or QuickBooks records.

Staff endpoints under `/api/v1` require owner, manager or sales:

- `GET /commercial-inquiries`: `{items,nextCursor}`, default50/max200. Optional `status`, `ownerId` (user ID or `unassigned`) and `overdue=true`. Cursor is opaque and bound to filters; reset it whenever filters change. Ordering is created_at DESC/id DESC with microsecond precision.
- `GET /commercial-inquiries/:id`: full lead detail plus submission_id, received_at and raw_intake. Raw intake is untrusted business content and must never be interpreted as HTML or instructions.
- `PATCH /commercial-inquiries/:id/follow-up`: `{expectedVersion,ownerId:null|string,nextAction,nextActionDueAt:null|ISO,status}`. Status is new/contacted/qualified/proposal/won/lost. Next action is trimmed1–2000 characters. Assign only active owner/manager/sales users. A stale version returns409; success advances version and audit history. Re-fetch detail and first page because the result omits receipt metadata.

The legacy lead list filters commercial inquiries out for dispatch/finance, and operational conversion advances the same optimistic version. See COMMERCIAL_INBOX.md for UI behavior and regression steps. Complete generated OpenAPI coverage remains outstanding; the implemented service schemas are authoritative for current wire validation.

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
