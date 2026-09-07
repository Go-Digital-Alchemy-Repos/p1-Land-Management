# Provider Applications & Vetting

The provider application system controls how therapists apply to join the directory, how admins review them, and how approval connects to directory visibility and subscription readiness.

## Primary Surfaces

| Surface               | Path                            | Purpose                                                                                                         |
| --------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Therapist application | `/therapist/apply`              | Multi-step applicant workflow with autosave, references, credentials, fee payment, and submission.              |
| Therapist status      | `/therapist/application-status` | Applicant-facing status and next steps.                                                                         |
| Admin applications    | `/admin/applications`           | Application queue, detail review, status transitions, references, background checks, interviews, and decisions. |
| Reference form        | `/reference/:token`             | External reference submission flow.                                                                             |

The application API is mounted at `/api/therapist/application` and requires the `therapist` role. Admin review is mounted at `/api/admin/applications`.

## Application Lifecycle

Allowed status transitions are defined in `application.service.ts`.

Main flow:

1. `draft`
2. `submitted`
3. background check and reference collection states
4. `ready_for_interview`
5. interview scheduled/completed states
6. `approved_pending_subscription`
7. `active_member`

Terminal or stopping states include `denied` and `withdrawn`.

Admins should use the transition endpoint instead of writing statuses directly, because transition logic records timeline entries and returns allowed alternatives when a transition is invalid.

## Applicant Data

Applications can include:

- form data and current step autosave state
- credentials and license metadata
- up to 3 references
- background check record
- interview record
- decision record
- timeline entries
- application fee payment status

Applicant-facing reads sanitize references and background check fields so private admin/vendor details are not exposed.

## Payments

Application fee checkout is created through Stripe using `createPaymentSession`.

Important behavior:

- Existing open checkout sessions are reused when possible.
- Fee amount and policy copy come from directory settings.
- Successful payment updates `paymentStatus` and timeline state.
- Application fee payment is separate from membership and ecommerce checkout.

## Review Operations

Admins can:

- filter applications by status
- inspect full application detail
- transition status with notes
- initiate/sync/resend/update background checks
- resend reference requests
- schedule and update interviews
- add timeline notes

Background check reports must use HTTPS URLs, and admin notes/status details are length-limited by the route.

## Related Files

- `client/src/features/therapist/application-page.tsx`
- `client/src/features/therapist/application-status-page.tsx`
- `client/src/features/admin/applications-page.tsx`
- `client/src/features/admin/application-detail-page.tsx`
- `client/src/features/public/reference-form-page.tsx`
- `server/services/application.service.ts`
- `server/services/background-check.service.ts`
- `server/storage/application.storage.ts`
- `shared/schema/provider-applications.ts`
