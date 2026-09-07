# API contracts

Same-origin `/api/v1` endpoints use verified Better Auth sessions. Mutations require the configured dashboard Origin. Errors use HTTP status and an error message; callers must preserve pending operations on failure.

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
