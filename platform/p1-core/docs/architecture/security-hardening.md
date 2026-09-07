# Security Hardening & Environment Requirements

## Authentication

- **JWT tokens** stored in HTTP-only cookies (`corePlatform_token`)
- Token expiry: 7 days
- Token revocation is planned via user-level `session_version`; see `security-ops-stabilization-roadmap.md`
- Password hashing: `bcryptjs` with 12 salt rounds
- Cookie settings: `httpOnly: true`, `secure: true` (production), `sameSite: lax`

## Secret Management

### Required Environment Variables

| Variable                              | Required In     | Description                                  |
| ------------------------------------- | --------------- | -------------------------------------------- |
| `SESSION_SECRET`                      | Production      | JWT signing key; must not be the dev default |
| `DATABASE_URL`                        | Production      | PostgreSQL connection string                 |
| `STRIPE_SECRET_KEY`                   | Stripe features | Stripe API key                               |
| `STRIPE_WEBHOOK_SECRET`               | Stripe webhooks | Webhook signature verification               |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Email           | SMTP delivery configuration                  |
| `SMTP_FROM`                           | Email           | Default sender address                       |
| `BACKUP_R2_ACCESS_KEY_ID`             | System backups  | Cloudflare R2 backup access key              |
| `BACKUP_R2_SECRET_ACCESS_KEY`         | System backups  | Cloudflare R2 backup secret                  |
| `BACKUP_R2_BUCKET_NAME`               | System backups  | Cloudflare R2 backup bucket                  |
| `BACKUP_R2_ACCOUNT_ID`                | System backups  | Cloudflare R2 account ID                     |
| `APP_URL`                             | Production      | Base URL for origin validation               |
| `TRUSTED_ORIGINS`                     | Production      | Comma-separated trusted origins              |

### Enforcement

- `enforceRequiredSecrets()` in `server/middleware/security.ts` runs at startup
- In production, missing `SESSION_SECRET` or `DATABASE_URL` causes immediate process exit
- Dev default `SESSION_SECRET` ("dev-secret-change-me") is rejected in production

## Request Security

### Helmet CSP

Content Security Policy directives are configured in `securityHeaders()`:

- Scripts: self + Stripe JS
- Styles: self + unsafe-inline + Google Fonts
- Images: self + R2 + OpenFreeMap sprites/tiles (legacy OpenStreetMap origin remains allowed)
- Connections: self + Stripe API + R2 + OpenFreeMap styles, vector tiles, sprites, and glyphs (legacy OpenStreetMap origin remains allowed)
- Frames: self + Stripe
- Objects: none

### Rate Limiting

| Limiter                 | Window | Max Requests | Scope                    |
| ----------------------- | ------ | ------------ | ------------------------ |
| `apiLimiter`            | 15 min | 300          | All `/api/*`             |
| `loginLimiter`          | 15 min | 10           | Login endpoint           |
| `registerLimiter`       | 60 min | 5            | Registration             |
| `forgotPasswordLimiter` | 15 min | 5            | Password reset request   |
| `resetPasswordLimiter`  | 15 min | 10           | Password reset execution |
| `guestMessageLimiter`   | 15 min | 5            | Guest messages           |

All rate limiters are skipped in development mode.

### Origin Checking

- `originCheck` middleware validates `Origin` or `Referer` headers for state-changing requests (POST, PUT, PATCH, DELETE)
- GET, HEAD, OPTIONS requests are exempt
- Stripe webhook endpoint is exempt
- Trusted origins are derived from `APP_URL`, `TRUSTED_ORIGINS`, and the request `Host` header
- Skipped in development mode
- Explicit CSRF token protection is planned as a companion to origin checking; see `security-ops-stabilization-roadmap.md`

### Request Body Limits

- JSON body: 1 MB limit
- URL-encoded body: 1 MB limit
- Stripe webhook: raw body parser (separate from JSON parser)

## Role-Based Access Control

Three roles: `user`, `therapist`, `admin`

- `authenticateToken` — Requires valid JWT; attaches user to `req.user`
- `optionalAuth` — Attaches user if token present, continues regardless
- `requireRole(...roles)` — Checks `req.user.role` against allowed roles
- Admin routes enforce `requireRole("admin")` via the admin router middleware

## Logging Security

- Sensitive fields are redacted in request logs: passwords, tokens, emails, phone, address, SSN, DOB
- Long text fields (bio, content, body, description) are truncated to 100 chars
- Response bodies are truncated to 500 chars in logs
- Error stack traces limited to 5 lines
