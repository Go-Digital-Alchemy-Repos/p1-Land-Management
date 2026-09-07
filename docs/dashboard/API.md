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

## Planned commercial inquiry contract

The [commercial initiative](../initiatives/commercial-industrial-sales.md) specifies a proposed versioned server-to-server Core delivery and dashboard inbox receipt, not a currently available endpoint. Complete OpenAPI/Zod design before implementation: source installation/submission identity, payload version/fingerprint, optional contact-channel validation, commercial context, bounded attribution, private attachment references and retry-safe response mapping. Public browsers continue to submit once to the managed Core form. Existing business API/auth and generated-client work remains required.

Office contacts follow-up (deployed checkpoint8039f99): `/clients/:clientId/contacts` GET/POST and `/clients/:clientId/contacts/:id` POST use the existing contact/client relationship. Every route requires an office role; they do not create login identities or grants. Contact edits require the current integer version; competing edits produce one success and one409. `archived` retains historical records, and every mutation is audited. Migration0008 adds only contact archive/version/index fields. The office contact editor supports create/edit/archive/restore. Dedicated tests passed finance access, anonymous/crew/client denials, cross-client mutation mismatch, concurrent edit409 and retained archived records. Browser fixture verified billing contact creation, archival and restoration. Contact changes never modify accepted estimate or accounting snapshots.

## Assessment availability follow-up (local, not deployed)

`GET /assessment-availability` returns `{config,blackouts,timeZone}`. `POST /assessment-availability` requires `{version,durationMinutes,bufferBefore,bufferAfter,windows:[{day,start,end}]}`; weekday0isSunday and times are HH:mm in America/New_York. Duration15–240minutes and buffers0–120minutes; overlapping windows or windows shorter than duration+buffers fail400. Current version required; stale409. Rules retire only future, unbooked, generated slots. Booked and manually created appointments remain.

`POST /assessment-availability/generate` takes `{from,through}` ISO dates, inclusive1–90days, and returns `{created}`. Generation is explicit after saving rules; retries preserve existing slots. Appointment and travel occupancy must fit the configured window. Nonexistent/cross-transition local appointment times are skipped; local9am stays9am as UTC offset changes.

`POST /assessment-availability/blackouts` accepts UTC `{startsAt,endsAt,reason}`; `/assessment-availability/blackouts/:id/archive` removes a blackout through archival. A blackout overlapping a confirmed appointment or its buffers fails409. Availability reads exclude blackouts; booking checks the same condition transactionally. The office form clearly labels blackout entry with the device timezone; weekly windows always use New York.

All availability management routes require owner/manager/dispatch on the server. Client booking still requires property access. Config, generation, booking, manual slots and blackout mutations share the calendar advisory transaction lock; all mutations are audited. Manual availability may reuse a retired unbooked start but never overwrite a booking. Migration0009 is additive; application rollback can retain the new columns/tables.

Seven-test combined suite plus migration replay passed. Assessment coverage includes six-role management endpoint matrix, repeated generation, spring offset change, stale config, retained bookings, blackout travel buffers, booking/blackout race, and retired-slot reoffer. Browser fixture of the real component exercised duration saving, generation and blackout creation. Physical-device and live authenticated acceptance remain outstanding.
