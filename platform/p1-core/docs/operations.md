# Operations Guide

## Health & Readiness Endpoints

### `GET /api/health`

Returns basic application health status. Does not require authentication.

**Response:**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "nodeVersion": "v20.x.x",
  "uptime": 3600,
  "memory": {
    "rss": 120,
    "heapUsed": 45,
    "heapTotal": 60,
    "external": 5
  },
  "timestamp": "2026-04-02T12:00:00.000Z"
}
```

- `version`: Application version from `package.json`
- `nodeVersion`: Node.js runtime version
- `uptime`: Process uptime in seconds
- `memory`: Memory usage in MB (RSS, heap used, heap total, external)

### `GET /api/health/ready`

Checks if the application is ready to serve traffic by verifying database connectivity.

**Response (200):**

```json
{
  "status": "ready",
  "database": "connected",
  "uptime": 3600,
  "timestamp": "2026-04-02T12:00:00.000Z"
}
```

**Response (503):**

```json
{
  "status": "not_ready",
  "database": "disconnected",
  "timestamp": "2026-04-02T12:00:00.000Z"
}
```

### `GET /api/health/metrics`

Returns in-memory application metrics. Resets on process restart.

**Access control:** In production, this endpoint returns 404 unless `METRICS_ENABLED=true` and a matching
`Authorization: Bearer <METRICS_BEARER_TOKEN>` header are supplied. It is available without authentication
in development.

**Response:**

```json
{
  "uptimeSeconds": 3600,
  "requests": {
    "GET /api/health": { "count": 50, "avgMs": 2, "minMs": 1, "maxMs": 10 },
    "POST /api/auth/login": { "count": 15, "avgMs": 120, "minMs": 80, "maxMs": 300 }
  },
  "errors": {
    "400": 5,
    "401": 12,
    "500": 1
  },
  "dbQueries": {
    "count": 500,
    "avgMs": 5,
    "minMs": 1,
    "maxMs": 200
  },
  "email": {
    "success": 10,
    "failure": 1
  },
  "domains": {
    "checkout": { "created": 10, "failed": 1 },
    "webhook": { "processed": 12 }
  }
}
```

- Route paths are normalized (UUIDs and numeric IDs replaced with `:id`)
- Error counts are grouped by HTTP status code
- DB query and email metrics track when explicitly instrumented via `recordDbQuery()` and `recordEmailOutcome()`
- Use `?format=prometheus` for the authenticated, stack-labeled scrape view. It excludes route paths and
  exposes only aggregate process, database, email, HTTP-error, and domain-outcome counters.

## Structured Log Format

All server logs are structured JSON (in production) or pretty-printed (in development).

### Log Fields

| Field | Type | Description |
|-------|------|-------------|
| `level` | number | Pino log level (30=info, 40=warn, 50=error) |
| `time` | number | Unix timestamp in milliseconds |
| `source` | string | Logger category (http, email, r2, stripe, auth, app, db, cms, metrics) |
| `msg` | string | Human-readable log message |
| `requestId` | string | Full UUID correlation ID for the request |
| `method` | string | HTTP method (on request logs) |
| `path` | string | Request path (on request logs) |
| `statusCode` | number | Response status code (on request logs) |
| `durationMs` | number | Request duration in milliseconds (on request logs) |
| `error` | string | Error message (on error logs) |
| `stack` | string | First 5 lines of stack trace (on error logs) |

### Logger Categories

- **http**: Request/response logging
- **email**: Email sending outcomes
- **r2**: Cloudflare R2 storage operations
- **stripe**: Stripe payment/webhook operations
- **auth**: Authentication and authorization
- **app**: General application events and errors
- **db**: Database operations and connection status
- **cms**: CMS page and menu operations
- **metrics**: Metrics-related logging

### Request ID / Correlation ID

Every request is assigned a full UUID as a correlation ID. The ID:
- Is generated server-side (or accepted from an incoming `X-Request-Id` header)
- Is automatically included in every log line as `requestId` via AsyncLocalStorage (no manual passing required)
- Is returned in the `X-Request-Id` response header
- Can be used for support tracing: given a request ID, search logs for all related entries

## PII Redaction

The following fields are automatically redacted from all logged response bodies:

| Field Pattern | Reason |
|---------------|--------|
| `password`, `currentPassword`, `newPassword` | Authentication credentials |
| `token`, `resetToken`, `secureToken` | Security tokens |
| `secret`, `authorization` | API keys and auth headers |
| `email` | Personal email addresses |
| `phone` | Phone numbers |
| `address`, `addressLine1`, `addressLine2` | Physical addresses |
| `refereeEmail`, `refereePhone` | Reference contact info |
| `ssn` | Social security numbers |
| `dateOfBirth` | Date of birth |

Redaction is applied:
- To ALL API response bodies logged by the HTTP middleware (not just auth paths)
- Recursively through nested objects
- Through arrays of objects
- Field matching is case-insensitive and uses `includes` (e.g. `userEmail` would also be redacted)

Long text fields (`bio`, `content`, `body`, `description`) are truncated to 100 characters in logs.

## Production Error Handling

- **5xx errors**: Return generic `"Internal Server Error"` message. The actual error details are only logged server-side.
- **4xx errors**: Return the specific error message to help the client fix the request.
- Stack traces are never included in production API responses.
- Full error details (message, first 5 stack trace lines) are always logged with the request ID for debugging.

## Common Failure Troubleshooting

### Application Won't Start

1. Check `/api/health` — if it responds, the app is running
2. Check `/api/health/ready` — if database is "disconnected":
   - Verify `DATABASE_URL` environment variable is set correctly
   - Check database server is reachable
3. In production, check for `FATAL:` log entries — these indicate missing required secrets

### High Error Rates

1. Check `/api/health/metrics` for error counts by status code
2. Search logs by request ID to trace specific failures
3. Common patterns:
   - Many 401s: Token expiration or auth misconfiguration
   - Many 400s: Client validation issues
   - Many 500s: Database or external service failures

### Slow Responses

1. Check `/api/health/metrics` for route latency (`avgMs`, `maxMs`)
2. Check `dbQueries` metrics for slow database queries
3. Check `/api/health` memory stats for memory pressure (high RSS or heap usage)

### Email Delivery Issues

1. Check `/api/health/metrics` email success/failure counts
2. Search logs with `source: "email"` for specific error details
3. Verify email service configuration (API keys, sender domain)

### CMS Issues

1. Search logs with `source: "cms"` for CMS-specific errors
2. CMS routes log the request ID for correlation with HTTP request logs
