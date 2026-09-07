# Operational Runbook — Logging, Health Checks & Monitoring

## Health Check Endpoints

### Basic Health Check

```
GET /api/health
```

Returns:
- `status`: "ok"
- `version`: Package version
- `nodeVersion`: Node.js version
- `uptime`: Seconds since start
- `memory`: RSS, heap used/total, external (MB)
- `timestamp`: ISO 8601

Use this for liveness probes and load balancer health checks.

### Readiness Check

```
GET /api/health/ready
```

Verifies database connectivity by running `SELECT 1`. Returns:
- `status`: "ready" / "not_ready"
- `database`: "connected" / "disconnected"

Returns **503** if the database is unreachable. Use this for readiness probes — don't route traffic to an instance that can't reach the database.

### Metrics Endpoint

```
GET /api/health/metrics
```

Available without authentication in development. In production it returns `404` unless both
`METRICS_ENABLED=true` and a matching `Authorization: Bearer <METRICS_BEARER_TOKEN>` header are present.
The JSON response contains in-memory request metrics (method, path, duration, status-code aggregates).

It also returns aggregate `domains` outcome counters for checkout creation, payment-webhook processing,
refunds, expired inventory reservations, transactional notifications, backups, and restores. These counters
contain no order IDs, customer data, provider payloads, or money values. Treat them as a process-local signal:
export or scrape them at the configured interval, and define client-approved alert thresholds and responders
before a transaction-enabled launch.

Monitoring systems should scrape the bounded Prometheus transport rather than the JSON detail view:

```bash
curl --fail --silent --show-error \
  -H "Authorization: Bearer $METRICS_BEARER_TOKEN" \
  'https://admin.example.com/api/health/metrics?format=prometheus'
```

The Prometheus response is labeled with `client_stack_id` and intentionally excludes request paths. It
contains process uptime, database query counts, email outcomes, aggregate HTTP errors, and domain outcomes.
It contains no account IDs, order IDs, payloads, amounts, or customer data.

## Logging

### Logger Architecture

The application uses **Pino** with named child loggers:

| Source | Logger | Description |
|--------|--------|-------------|
| `http` | `logger.http` | Request/response logging |
| `email` | `logger.email` | Email send operations |
| `r2` | `logger.r2` | Cloudflare R2 file operations |
| `stripe` | `logger.stripe` | Stripe API calls and webhooks |
| `auth` | `logger.auth` | Authentication events |
| `app` | `logger.app` | General application events |
| `db` | `logger.db` | Database operations |
| `cms` | `logger.cms` | CMS operations |
| `metrics` | `logger.metrics` | Metrics collection |

### Log Levels

Set via `LOG_LEVEL` environment variable. Default: `info`.

Available levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

### Request ID Correlation

Every request receives a UUID via `requestIdMiddleware`. The ID is:
- Taken from `X-Request-Id` header if present (forwarded from load balancer)
- Generated via `crypto.randomUUID()` otherwise
- Stored in `AsyncLocalStorage` for automatic inclusion in all log entries
- Returned in the `X-Request-Id` response header

### Log Format

- **Development**: Pretty-printed via `pino-pretty` with colorization
- **Production**: Structured JSON (one line per entry)

### Request Logging

All `/api/*` requests are logged on completion with:
- Method, path, status code, duration (ms)
- Request ID
- Redacted response body (sensitive fields replaced with `[REDACTED]`)

### Sensitive Data Handling

The following fields are automatically redacted in logs:
`password`, `currentPassword`, `newPassword`, `token`, `resetToken`, `secret`, `authorization`, `email`, `phone`, `address`, `ssn`, `dateOfBirth`

Long text fields (`bio`, `content`, `body`, `description`) are truncated to 100 characters.

## Common Operational Tasks

### Checking Application Health

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/ready
```

### Viewing Structured Logs

In production, pipe stdout through `jq` for readability:
```bash
node server/index.js | jq '.'
```

### Checking Database Connectivity

The `/api/health/ready` endpoint runs `SELECT 1` against the database. If it returns 503, check:
1. `DATABASE_URL` environment variable is set correctly
2. Network connectivity to the Railway Postgres private hostname
3. The Railway database service and its volume are healthy

### Stripe Webhook Debugging

1. Check logs for `[stripe]` source entries
2. Webhook endpoint: `POST /api/stripe/webhook`
3. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
4. Stripe webhook events are verified via signature before processing
