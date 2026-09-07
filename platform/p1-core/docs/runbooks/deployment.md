# Deployment & Environment Setup Runbook

## Prerequisites

- Node.js (LTS recommended)
- PostgreSQL database (production uses Railway Postgres)
- Stripe account (optional, for payments/subscriptions)
- SMTP email account (optional, for outbound email)
- Cloudflare R2 bucket (optional, for system backups)

## Environment Variables

### Required for Production

| Variable          | Description                                                                |
| ----------------- | -------------------------------------------------------------------------- |
| `CLIENT_STACK_ID` | Stable lowercase kebab-case identity used by deployment checks and backups |
| `SESSION_SECRET`  | Strong random string for JWT signing. Must not be "dev-secret-change-me"   |
| `DATABASE_URL`    | PostgreSQL connection string                                               |
| `APP_URL`         | Current canonical Core Platform service origin                             |
| `TRUSTED_ORIGINS` | Exact comma-separated browser origins allowed to submit API requests       |

### Required for Features

| Variable                      | Feature  | Description                                      |
| ----------------------------- | -------- | ------------------------------------------------ |
| `STRIPE_SECRET_KEY`           | Payments | Stripe secret API key                            |
| `STRIPE_PUBLISHABLE_KEY`      | Payments | Stripe publishable key                           |
| `STRIPE_WEBHOOK_SECRET`       | Payments | Stripe webhook endpoint secret                   |
| `SMTP_HOST`                   | Email    | SMTP host                                        |
| `SMTP_PORT`                   | Email    | SMTP port, defaults to 587                       |
| `SMTP_USER`                   | Email    | SMTP username                                    |
| `SMTP_PASS`                   | Email    | SMTP password                                    |
| `SMTP_FROM`                   | Email    | Default sender address                           |
| `SETUP_TOKEN`                 | Security | Optional token required for first admin setup    |
| `CMS_PREVIEW_SECRET`          | CMS      | Optional signing secret for CMS preview links    |
| `METRICS_ENABLED`             | Metrics  | Set to "true" to enable metrics endpoint         |
| `METRICS_BEARER_TOKEN`        | Metrics  | Unique 32+ character bearer token for production metrics scrapes |
| `LOG_LEVEL`                   | Logging  | Pino log level (default: "info")                 |
| `SYSTEM_BACKUPS_ENABLED`      | Backups  | Set to "true" to enable scheduled system backups |
| `BACKUP_R2_ACCOUNT_ID`        | Backups  | Cloudflare R2 account ID for backup storage      |
| `BACKUP_R2_ACCESS_KEY_ID`     | Backups  | Cloudflare R2 access key for backup storage      |
| `BACKUP_R2_SECRET_ACCESS_KEY` | Backups  | Cloudflare R2 secret key for backup storage      |
| `BACKUP_R2_BUCKET_NAME`       | Backups  | Cloudflare R2 backup bucket                      |
| `BACKUP_R2_PREFIX`            | Backups  | Optional path prefix for stored backup snapshots |

## Build & Deploy

For client deployments, follow the dedicated
[single-client deployment runbook](client-stack-deployment.md) and the canonical
[Client Migration Master Plan](../core-project-plan.md). Pass the approved release record to the deployment
preflight; it must report ready before building or releasing. The public React site uses the normal
client domain, the dashboard uses a protected admin
subdomain, and public browser API traffic should use the site's same-origin `/api` route where feasible.
Domain changes remain gated by ownership, DNS, certificate, routing, health, and rollback validation.

### Development

```bash
npm run dev
```

Loads `.env` when present and starts Express + Vite dev server on port 5001 by default.
Set `PORT=...` to override. `DATABASE_URL` must be set in `.env` or the shell.

### Production Build

```bash
npm run build
```

Builds the Vite frontend to `dist/public/` and compiles the server.

### Production Start

```bash
npm start
```

Runs the compiled server. On startup:

1. `enforceRequiredSecrets()` checks for required environment variables
2. Database migrations run automatically via `server/migrate.ts`; Drizzle history is read from
   `drizzle.__drizzle_migrations`, and the backward-compatible reconciliation path provisions SQL
   migrations that predate complete journal coverage
3. Express server starts on port 5000 in production unless `PORT` is set
4. Scheduled publish service starts for CMS timed publishing

## Database Management

### Push Schema Changes (Development)

```bash
npm run db:push
```

### Run Type Check

```bash
npm run check
```

### Run Linter

```bash
npm run lint
```

### Run Tests

```bash
npm test
```

## Initial Setup

On first deployment, navigate to `/setup` to create the initial admin account. The setup route is only available when no admin users exist in the database.

## Post-Deployment Verification

1. Check `/api/health` returns `{ status: "ok" }`
2. Check `/api/health/ready` returns `{ status: "ready", database: "connected" }`
3. Navigate to the home page to verify CMS rendering
4. Test login with the admin account
5. Verify Stripe webhook endpoint is reachable
6. Check `/robots.txt` and `/sitemap.xml` are generated correctly
