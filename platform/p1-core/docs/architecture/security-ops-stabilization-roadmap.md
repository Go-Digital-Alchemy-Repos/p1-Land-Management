# Security and Operations Stabilization Roadmap

Date: 2026-06-18

This roadmap turns the remaining security and async-processing debt into implementation-ready work. It is intentionally compatibility-safe: no route, role, or schema rename is required before these items can ship.

## Current Baseline

- Auth uses HTTP-only JWT cookies with a 7-day expiry.
- Production rejects missing/default `SESSION_SECRET` and `DATABASE_URL`.
- State-changing requests are protected by origin/referer checks.
- Stripe webhooks verify signatures and are exempt from browser-origin checks.
- Rate limits cover API, login, registration, password reset, and guest messages.
- Email, background-check, notification, and scheduled-publishing work is still synchronous or interval-driven.

## Priority 1: JWT Revocation

### Goal

Invalidate already-issued JWTs for critical account events without forcing a global signing-key rotation.

### Recommended Design

1. Add a `session_version` integer column to `users`, default `1`.
2. Include `sessionVersion` and a generated `jti` in all newly issued JWTs.
3. During `authenticateToken`, load the user and reject the token when `payload.sessionVersion !== user.sessionVersion`.
4. Increment `session_version` on password reset, admin suspension, role change, email change, and manual "log out all sessions."
5. Add a short-lived `revoked_jwts` table only if one-token revocation becomes necessary before user-level revocation is enough.

### Acceptance Criteria

- Password reset invalidates prior cookies.
- Account suspension invalidates prior cookies immediately.
- Existing valid sessions continue working until the user is changed or the token expires.
- Unit tests cover valid token, stale `sessionVersion`, suspended user, and malformed payload cases.

## Priority 2: CSRF Token Protection

### Goal

Keep the existing origin/referer checks, but add an explicit CSRF token for authenticated browser writes.

### Recommended Design

1. Issue a non-HTTP-only `corePlatform_csrf` cookie on successful login and on `/api/auth/me` when missing.
2. Require `X-CSRF-Token` on authenticated `POST`, `PUT`, `PATCH`, and `DELETE` requests.
3. Compare the header to the CSRF cookie using constant-time comparison.
4. Exempt non-browser integrations that already have stronger verification, such as Stripe webhooks.
5. Update the client request helper to read the cookie and attach the header automatically.

### Acceptance Criteria

- Authenticated writes without the token return `403`.
- Authenticated writes with a valid token continue to work.
- Stripe webhook tests remain green.
- Existing origin-check tests remain green and gain a CSRF-specific companion test.

## Priority 3: Postgres-Backed Job Queue

### Goal

Move side effects out of request/response paths so slow or flaky providers do not block users.

### Recommended Design

Use `pg-boss` because the platform already runs on Postgres and does not currently require Redis for other production workflows.

Initial queues:

- `email.send`
- `application.background_check.invite`
- `notification.dispatch`
- `cms.scheduled_publish`
- `ecommerce.order_receipt`

Implementation phases:

1. Add queue bootstrap and worker lifecycle wiring to the server startup path.
2. Wrap existing senders in idempotent job handlers.
3. Enqueue emails from existing services while keeping a synchronous fallback behind an environment flag.
4. Add retry/backoff and dead-letter visibility in logs.
5. Add an admin read-only job status page after the queue is stable.

### Acceptance Criteria

- Email and background-check requests return quickly after enqueue.
- Failed jobs retry with bounded backoff and land in a failed state after max attempts.
- Job handlers are idempotent by resource id or provider event id.
- Tests cover enqueue payload validation and one handler per critical queue.

## Sequencing

1. Ship `session_version` JWT revocation first because it has the smallest operational footprint and closes the highest-impact auth gap.
2. Add CSRF tokens next because it touches every authenticated browser mutation and needs focused manual QA.
3. Add `pg-boss` last because it changes operational behavior and should be rolled out behind feature flags.

## Rollback Notes

- JWT revocation can roll back by accepting missing `sessionVersion` for pre-rollout tokens until they expire.
- CSRF enforcement should launch in report-only logging mode before hard blocking writes.
- Queue adoption should keep a synchronous fallback during the first production release.
