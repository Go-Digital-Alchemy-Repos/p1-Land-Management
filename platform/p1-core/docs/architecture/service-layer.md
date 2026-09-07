# Service Layer & Caching Strategy

## Service Layer Architecture

The application uses a storage-facade pattern rather than traditional service classes. Business logic flows as:

```
Route Handler → Storage Facade → Domain Storage → Drizzle ORM → PostgreSQL
```

### Storage Facade

`server/storage/index.ts` exports a single `storage` object that aggregates all domain-specific storage classes:

```typescript
export const storage = {
  users: new UserStorage(),
  therapists: new TherapistStorage(),
  applications: new ApplicationStorage(),
  events: new EventStorage(),
  blog: new BlogStorage(),
  cmsPages: new CmsPagesStorage(),
  // ... 28 storage classes total
};
```

### Standalone Services

For cross-cutting concerns that don't map to a single storage domain:

| Service                   | File                                           | Responsibility                                    |
| ------------------------- | ---------------------------------------------- | ------------------------------------------------- |
| `EmailService`            | `server/services/email.service.ts`             | Template rendering, email dispatch via SMTP       |
| `R2Service`               | `server/services/r2.service.ts`                | Cloudflare R2 file upload/delete/signed URLs      |
| `BackgroundCheckService`  | `server/services/background-check.service.ts`  | Provider background check workflow                |
| `ScheduledPublishService` | `server/services/scheduled-publish.service.ts` | Periodic check for CMS pages scheduled to publish |

### Service Boundary Philosophy

Each backend service module (`email.service.ts`, `r2.service.ts`, `config/stripe.ts`) owns a single integration concern. Services are responsible for:

- Configuration fetching and caching
- Client lifecycle management (construction, caching, reset)
- Error handling and logging within their domain
- Exposing a clean async interface to route handlers

### Route Handler Responsibility

Route handlers are intentionally thin. They:

1. Validate request input (via Zod schemas or middleware)
2. Call storage methods
3. Return JSON responses

Business logic that spans multiple storage domains is currently in route handlers (e.g., `application.routes.ts` coordinates applications, email, and user updates). This is a known area for future refactoring.

## Caching Strategy

### Settings Caching (Server-Side)

`SettingsStorage` implements a TTL-based in-memory cache keyed by category and individual setting key.

#### How it works

- **`getDecryptedCategory(category)`** checks a `Map<string, CacheEntry>` before querying the database. Cache entries expire after a configurable TTL (default: 60 seconds).
- **`getSetting(key)`** uses a separate per-key cache with the same TTL.
- **`upsertSetting` and `deleteSetting`** automatically invalidate the relevant category cache after writes.

#### Invalidation

- **Automatic**: Every `upsertSetting` and `deleteSetting` call invalidates the affected category.
- **Explicit**: `invalidateCategory(category)` clears both the category cache and any per-key entries tracked via an internal category-to-key index.
- **Route-level**: The `PUT /settings` route additionally calls `invalidateCategory` and resets service-specific caches (`resetStripeClient`, `resetClient`, `resetMailgunConfig`) when relevant categories change.
- **Full reset**: `invalidateAll()` clears every cached entry.

#### Why in-memory TTL

- The application runs as a single Node.js process, so in-memory caching is coherent.
- A 60-second TTL bounds staleness for settings that change outside the admin panel.
- No external dependency (Redis) is required.

### Static Responses with HTTP Cache Headers

- `robots.txt` — `Cache-Control: public, max-age=3600`
- `sitemap.xml` — `Cache-Control: public, max-age=3600`

### Client-Side Caching

TanStack Query provides the primary caching layer:

- 5-minute stale time means repeated navigation doesn't trigger redundant API calls
- Cache is keyed by query parameters, so paginated/filtered results are cached independently
- Mutations invalidate relevant cache entries

### Future Caching Considerations

1. **Redis/in-memory cache** for frequently-read, rarely-changed data (specializations list, membership tiers)
2. **ETags or conditional requests** for CMS pages and blog posts
3. **CDN caching** for public API responses (directory listings with short TTL)

## Client Lifecycle

### R2 (Cloudflare S3-compatible storage)

- `cachedClient` and `cachedConfig` are module-level singletons.
- `getClient()` returns the cached client immediately if both are non-null, skipping the DB config fetch entirely.
- `resetClient()` nullifies both, forcing a fresh config fetch on next use.
- The settings update route calls `resetClient()` when the `cloudflare_r2` category changes.

### Mailgun (email)

- `cachedMailgunConfig` and a `mailgunConfigFetched` flag implement a singleton pattern.
- `getMailgunConfig()` fetches from DB once, then returns the cached result on subsequent calls. The `mailgunConfigFetched` flag is only set to `true` after a successful DB fetch — transient DB errors do not permanently cache null.
- `resetMailgunConfig()` clears both the config and the fetched flag.
- The settings update route calls `resetMailgunConfig()` when the `mailgun` category changes.

### Stripe

- `stripeInstance` is a module-level singleton constructed on first use.
- `resetStripeClient()` nullifies it, forcing reconstruction on next `getStripeClient()` call.
- `getUncachableStripeClient()` always creates a fresh instance (used for webhook and checkout flows that need the latest credentials).

## Error Handling Policy

### When to log-and-continue

- Configuration loading failures (Stripe, R2, Mailgun) — fall back to env vars or return null.
- Theme retrieval/parsing failures — return safe defaults.
- Redirect lookup failures — skip the redirect and proceed with normal routing.
- Checkout session retrieval for reuse — create a new session instead.

### When to re-throw

- Missing required configuration (e.g., no Stripe secret key at all) — throw with a descriptive message.
- Database write failures in critical paths — let the global error handler return a 500.

### Justified silent catches

- `optionalAuth` middleware: Invalid/expired tokens should not reject the request; the user simply remains unauthenticated.
- `normalizeOrigin` in security middleware: Malformed origin strings from clients are expected and should map to null.

## Retry Policy

A lightweight `retryOnce` utility (`server/utils/retry.ts`) retries a failed operation exactly once after a short delay (default 500ms). It is applied only to truly idempotent operations:

- **R2 uploads and deletes** — idempotent S3 operations where transient network errors are common. PutObject with the same key is idempotent by design.

Retry is **not** applied to:

- Email sends (not safely idempotent — duplicate sends are possible on ambiguous failures)
- Stripe operations (non-idempotent or already handled by Stripe SDK)
- Database mutations
- Any state-changing internal operations
