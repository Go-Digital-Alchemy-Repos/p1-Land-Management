# Backend Architecture

## Layering: Route → Service → Storage

The backend follows a three-layer architecture:

```
Route Handlers (server/routes/)
       │
       ▼
  Services (server/services/)
       │
       ▼
  Storage (server/storage/)
       │
       ▼
  Database (PostgreSQL via Drizzle ORM)
```

### Route Handlers (`server/routes/`)

Route handlers are **thin**. Their responsibilities are:

1. Parse and validate the incoming request (params, query, body)
2. Call the appropriate service function
3. Map the service result to an HTTP response (status code + JSON body)

Route files also apply middleware (authentication, role guards). They do **not** contain business logic, state machine rules, or side-effect orchestration.

**Public routes** live directly under `server/routes/` (e.g., `application.routes.ts`, `auth.routes.ts`).

**Admin routes** are grouped under `server/routes/admin/` and mounted behind admin auth middleware via `server/routes/admin/index.ts`.

### Services (`server/services/`)

Services own the domain logic. Each service is organized around a business domain:

| Service | Domain |
|---------|--------|
| `application.service.ts` | Application lifecycle: creation, submission, payment, state transitions, approval/denial side-effects, withdrawal, interview scheduling, reference email dispatch |
| `email.service.ts` | Email delivery (Mailgun/SMTP), template rendering |
| `background-check.service.ts` | Background check vendor integration, status sync, manual admin updates |
| `r2.service.ts` | File storage (Cloudflare R2) |
| `scheduled-publish.service.ts` | Scheduled content publishing |

Services call the **storage layer** for data access and may call other services for cross-cutting concerns (e.g., the application service calls the email and background-check services).

Key patterns in the application service:
- **State machine**: `ALLOWED_TRANSITIONS` map defines valid status transitions. `isValidTransition()` validates any proposed transition.
- **Side-effects on transition**: Approval triggers decision recording and therapist profile approval. Denial handles refund eligibility.
- **Error signaling**: Service functions return result objects (`{ success, error, status }`) rather than throwing, allowing route handlers to map to the correct HTTP status.

### Storage (`server/storage/`)

Storage classes are thin data-access wrappers around Drizzle ORM queries. They handle:
- CRUD operations mapped to database tables
- Query composition (joins, filters, ordering)
- No business logic

Each storage class corresponds to a domain aggregate (e.g., `ApplicationStorage` manages applications plus related records like timeline, credentials, references, background checks, interviews, and decisions).

## Shared Types (`shared/types/index.ts`)

Cross-boundary types that both frontend and backend use are defined here:
- `ApplicationStatus` — the status enum for applications
- `StatusTransitionResult` — service output for status change operations
- `SubmitApplicationResult` — service output for application submission
- `PaymentSessionResult`, `PaymentConfirmationResult` — payment flow types

## Adding a New Feature

1. **Define the data model** in `shared/schema/` if new tables are needed
2. **Add storage methods** in the appropriate `server/storage/` class
3. **Add or extend a service** in `server/services/` for the business logic
4. **Add thin route handlers** in `server/routes/` that call the service
5. **Add shared types** in `shared/types/index.ts` if the frontend needs them
