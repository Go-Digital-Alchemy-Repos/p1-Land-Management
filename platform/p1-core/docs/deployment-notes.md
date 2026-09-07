# Deployment Notes — Migration & Production Rollout

## Pre-Deployment Checklist

1. **Environment variables**: Ensure all required variables are set (see `docs/runbooks/deployment.md`)
   - `SESSION_SECRET` must be a strong random string (not the dev default)
   - `DATABASE_URL` must point to the production PostgreSQL instance
   - In separate public/admin deployments, `PUBLIC_SITE_ORIGIN` and `CORE_PLATFORM_ADMIN_ORIGIN` must be
     distinct canonical HTTPS origins; `APP_URL` must equal the admin origin for legacy Core services
   - `TRUSTED_ORIGINS` must include both exact origins once, plus only reviewed preview origins

2. **Database migrations**: Migrations run automatically on production startup via `server/migrate.ts`. Review pending migrations before deploying:
   - Check the `migrations/` directory for new migration files (journal in `migrations/meta/`)
   - Verify migration SQL is non-destructive (no `DROP TABLE` or `DROP COLUMN` without backup)

3. **Stripe configuration**:
   - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` must match the production Stripe account
   - Webhook endpoint URL must be updated in the Stripe dashboard to point to the production domain
   - Verify webhook events are configured for: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

4. **R2 / system backups**:
   - If `SYSTEM_BACKUPS_ENABLED=true`, backup R2 credentials must be for the production backup bucket
   - Keep backup credentials separate from any user-upload storage credentials used by a host platform or future integration

5. **Email (SMTP)**:
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` must match the production email account
   - Sender domain must be verified with the email provider
   - Check email templates exist in the database (seed if needed)

## Migration Notes

### Database Schema

- Migrations are managed by Drizzle ORM and stored in `migrations/` directory (with journal metadata in `migrations/meta/`)
- On production startup, `runMigrations()` applies any pending migrations automatically
- Schema uses `varchar` IDs (UUID-style strings generated via `gen_random_uuid()`)
- Timestamps use PostgreSQL `timestamp` column type (via Drizzle's `timestamp()`) with `defaultNow()` for creation/update tracking

### Known Migration Considerations

- **Duplicate migration prefixes**: Some migration files share `0003_*` and `0004_*` prefixes. These run correctly but could cause confusion. Do not renumber existing migrations — only ensure new ones use unique sequential numbers.
- **Index creation**: Several indexes were added during stabilization. These create in the background on PostgreSQL and should not cause downtime, but may briefly increase CPU on large tables.

## Production Rollout Cautions

### Features to Monitor After Deploy

1. **Origin checking**: The `originCheck` middleware validates request origins in production. If users report 403 errors on form submissions:
   - Check that `APP_URL` matches the actual domain
   - Add any additional origins to `TRUSTED_ORIGINS`
   - The middleware logs blocked requests for debugging

2. **Rate limiting**: Rate limiters are active in production (disabled in dev). Monitor for legitimate users hitting limits:
   - Login: 10 attempts / 15 minutes
   - Registration: 5 attempts / hour
   - Global API: 300 requests / 15 minutes
   - Adjust limits if users report "Too many requests" errors

3. **JWT token expiry**: Tokens expire after 7 days. Users will be logged out and need to re-authenticate. There is no token refresh mechanism — consider adding one if session continuity is important.

4. **Stripe webhooks**: Verify webhook delivery in the Stripe dashboard after deploying. Failed webhooks will cause subscription state to drift from Stripe's records. The webhook endpoint must receive raw body (not JSON-parsed) — this is handled by the separate `express.raw()` middleware.

5. **CMS scheduled publishing**: The `scheduledPublishService` runs on a fixed interval to check for pages scheduled to publish. Verify it's running by checking logs for `[cms]` source entries.

6. **Session secret rotation**: If `SESSION_SECRET` is changed, all existing JWT tokens become invalid and all users will be logged out. Plan secret rotation during low-traffic windows.

### Rollback Plan

If a deployment causes issues:

1. Revert to the previous deployment version
2. Database migrations are forward-only — if a migration must be undone, write a new migration that reverses the changes
3. Stripe webhook processing is idempotent — replaying events is safe
4. User sessions (JWT tokens) are stateless — no session store to clear

### Performance Expectations

- **Database readiness**: The readiness probe (`/api/health/ready`) returns 503 until Railway Postgres accepts queries.
- **Directory queries**: With current indexing, directory queries should complete in <100ms for tables under 10k rows. Monitor via the metrics endpoint if enabled.
- **Memory**: Typical RSS usage is 100–200 MB. The health endpoint reports memory usage for monitoring.
