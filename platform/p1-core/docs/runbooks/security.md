# Core Platform — Security Runbook

## Required Environment Variables

| Variable                | Required In                 | Description                                                                                                                                                                                               |
| ----------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`        | Production                  | JWT signing secret. Must NOT be the dev default (`dev-secret-change-me`). Use a cryptographically random string ≥ 32 characters.                                                                          |
| `DATABASE_URL`          | Production                  | PostgreSQL connection string.                                                                                                                                                                             |
| `APP_URL`               | Client production preflight | Current canonical Core Platform service origin (e.g., `https://app.example.com`). Used for origin checking and generated links.                                                                           |
| `TRUSTED_ORIGINS`       | Client production preflight | Comma-separated browser origins allowed by the CSRF origin check (e.g., `https://app.example.com,https://www.example.com`).                                                                               |
| `SETUP_TOKEN`           | Production                  | High-entropy bootstrap token required to create the initial admin account via `/api/setup/admin`. Keep it configured so a fresh or restored database cannot expose an unauthenticated first-admin window. |
| `STRIPE_SECRET_KEY`     | Production                  | Stripe API secret key for payment processing.                                                                                                                                                             |
| `STRIPE_WEBHOOK_SECRET` | Production                  | Stripe webhook signing secret for verifying webhook payloads.                                                                                                                                             |

The application enforces `SESSION_SECRET`, `DATABASE_URL`, and `SETUP_TOKEN` at startup in production and will exit immediately if they are missing or if `SESSION_SECRET` still has the dev default value.

## Rate Limiting

All rate limiters are **skipped in development** and enforced in production. They use `express-rate-limit` with standard headers (`RateLimit-*`) enabled.

| Endpoint                         | Window | Max Requests | Purpose                            |
| -------------------------------- | ------ | ------------ | ---------------------------------- |
| `POST /api/auth/login`           | 15 min | 10           | Brute-force login protection       |
| `POST /api/auth/register`        | 60 min | 5            | Registration abuse prevention      |
| `POST /api/auth/forgot-password` | 15 min | 5            | Password reset email flooding      |
| `POST /api/auth/reset-password`  | 15 min | 10           | Reset token brute-force protection |
| `POST /api/guest-messages`       | 15 min | 5            | Guest contact form spam prevention |
| `ALL /api/*`                     | 15 min | 300          | General API abuse prevention       |

## CSRF / Origin Check

The application uses **origin-based CSRF protection**, appropriate for a same-site SPA architecture that communicates exclusively via JSON API.

- **Safe methods** (`GET`, `HEAD`, `OPTIONS`) are always allowed.
- **Mutating requests** (`POST`, `PUT`, `PATCH`, `DELETE`) must include a valid `Origin` or `Referer` header matching a trusted origin.
- **Trusted origins** are derived from:
  - `APP_URL` environment variable
  - `TRUSTED_ORIGINS` environment variable (comma-separated)
  - The request's `Host` header (auto-added as `https://<host>`)
- **Stripe webhooks** (`/api/stripe/webhook`) are exempt — they are verified via Stripe's signature instead.
- Requests without any origin information receive `403 Forbidden: missing origin`.
- Requests from untrusted origins receive `403 Forbidden: untrusted origin`.
- Origin checking is **skipped in development**.

## Cookie Configuration

Authentication uses JWT tokens stored in HTTP-only cookies:

Each cookie carries a password-derived session version. Changing or resetting the account password
invalidates previously issued cookies, and suspended users are rejected by both required and
optional authentication. The first release from the legacy token format intentionally requires all
users to sign in again.

| Setting     | Value                | Notes                                                                      |
| ----------- | -------------------- | -------------------------------------------------------------------------- |
| Cookie name | `corePlatform_token` |                                                                            |
| `httpOnly`  | `true`               | Prevents JavaScript access (XSS mitigation)                                |
| `secure`    | `true` in production | Cookies only sent over HTTPS                                               |
| `sameSite`  | `lax`                | Prevents cross-site request attachment while allowing top-level navigation |
| `maxAge`    | 7 days               | Matches JWT expiry                                                         |
| `path`      | `/`                  | Available to all routes                                                    |

## Helmet / Content Security Policy

Helmet is enabled with the following CSP directives:

| Directive | Allowed Sources | Reason |
|---|---|---|
| `default-src` | `'self'` | Baseline restriction |
| `script-src` | `'self'`, `https://js.stripe.com` | App scripts + Stripe.js |
| `style-src` | `'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com` | App styles, inline styles (Tiptap/shadcn), Google Fonts |
| `font-src` | `'self'`, `https://fonts.gstatic.com`, `data:` | Google Fonts, embedded fonts |
| `img-src` | `'self'`, `data:`, `blob:`, `*.r2.cloudflarestorage.com`, `*.r2.dev`, `*.tile.openstreetmap.org`, `unpkg.com`, `tiles.openfreemap.org` | App images, R2 media, OpenFreeMap sprites/tiles |
| `connect-src` | `'self'`, `api.stripe.com`, `*.r2.cloudflarestorage.com`, `*.r2.dev`, `*.tile.openstreetmap.org`, `tiles.openfreemap.org` | API calls, Stripe, R2 uploads, OpenFreeMap styles, vector tiles, sprites, and glyphs |
| `frame-src` | `'self'`, `https://js.stripe.com`, `https://hooks.stripe.com` | Stripe 3D Secure / Elements iframes |
| `media-src` | `'self'`, `blob:`, `*.r2.cloudflarestorage.com`, `*.r2.dev` | Audio/video from R2 |
| `worker-src` | `'self'`, `blob:` | MapLibre worker and service workers |
| `object-src` | `'none'` | Block plugins (Flash, Java) |
| `base-uri` | `'self'` | Prevent base tag injection |
| `form-action` | `'self'` | Restrict form submission targets |

Additional Helmet settings:

- `crossOriginEmbedderPolicy`: disabled (app serves cross-origin media)
- `crossOriginResourcePolicy`: `cross-origin` (allows external origins to load served media)

## Payload Size Limits

| Parser                 | Limit |
| ---------------------- | ----- |
| `express.json()`       | 1 MB  |
| `express.urlencoded()` | 1 MB  |

## Error Handling

- **4xx errors**: Return the specific error message to help the client understand the issue.
- **5xx errors in production**: Return a generic `"Internal Server Error"` message. Internal details are logged server-side but never exposed to the client.
- **5xx errors in development**: Return the original error message for debugging convenience.

## Auth Route Information Disclosure

All authentication routes are designed to prevent email enumeration:

- **Login**: Returns `"Invalid email or password"` for both invalid email and invalid password.
- **Register**: Returns a generic message on conflict. Note: the HTTP status code (409 vs 201) still differs, so full enumeration resistance would require an email-verification-first flow (out of current scope).
- **Forgot password**: Always returns `"If an account with that email exists, a password reset link has been sent."` regardless of whether the email was found.
- **Reset password**: Returns `"Invalid or expired reset link"` without revealing whether the token was valid, expired, or never existed.

## Deployment Security Checklist

- [ ] `SESSION_SECRET` is set to a unique, cryptographically random value (≥ 32 chars)
- [ ] `DATABASE_URL` points to the production database through TLS or the provider's private network
- [ ] `APP_URL` is set to the canonical production URL
- [ ] `TRUSTED_ORIGINS` includes any additional legitimate origins (staging, admin panels)
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set for payment processing
- [ ] HTTPS is enforced (TLS termination at load balancer or reverse proxy)
- [ ] Database credentials use a least-privilege role
- [ ] `SETUP_TOKEN` is set if the initial admin account has not been created yet (remove after setup)
- [ ] Application logs are routed to a centralized logging system
- [ ] Rate limiting is active (verify `NODE_ENV=production`)
- [ ] Backup and recovery procedures are documented and tested
