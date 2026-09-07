# Database transport policy

Core uses one explicit transport policy for its application PostgreSQL pool, including migrations
and workers that import `server/db.ts`. Production release must verify the selected destination and
transport; a successful health check alone does not prove certificate validation.

| Configuration | Behavior |
| --- | --- |
| Remote URL without transport options | TLS with certificate chain and hostname verification |
| `sslmode=require` or `sslmode=verify-full` | Normalized to verified TLS; `require` never disables verification |
| `DATABASE_TLS_MODE=verify-full` | Verified TLS, optionally using `DATABASE_TLS_CA` PEM bundle |
| Explicit `sslmode=disable` or `DATABASE_TLS_MODE=private` on Railway internal hostname | No PostgreSQL TLS, only when Railway project and environment identity are present |
| Loopback development/test URL | No TLS by default; explicit verified TLS remains available |
| Production loopback with explicit disabled TLS | Startup rejected |

Private mode accepts only a hostname ending in `.railway.internal` together with
`RAILWAY_PROJECT_ID` and `RAILWAY_ENVIRONMENT_ID`. These are deployment configuration checks,
not cryptographic network attestation. Operators must verify that the service and database are in
the intended isolated Railway project/environment. Railway documents encrypted WireGuard tunnels
for its [private network](https://docs.railway.com/networking/private-networking); this is distinct
from PostgreSQL TLS certificate verification.

The application rejects ambiguous TLS sources: `PGSSLMODE`, URL SSL certificate/key options,
`ssl=no-verify`, unsupported SSL modes, duplicate SSL modes, host overrides and libpq compatibility
switches. Put a custom CA PEM bundle in `DATABASE_TLS_CA`; never disable certificate verification
to accommodate a private CA. Conflicting URL and environment modes fail at startup, with errors
that do not print the connection string. A URL's `sslmode` is removed after validation so the driver
cannot overwrite the selected TLS object, as described in the
[node-postgres SSL documentation](https://node-postgres.com/features/ssl).

## Deployment verification

Before releasing this policy, inspect configuration without printing credentials. Confirm the actual
host category, selected mode, Railway identity when private, and certificate authority when verified
TLS is used. Test connectivity from the application runtime network. For verified TLS, prove trusted
certificate success and untrusted/incorrect-host failure in a disposable fixture. For private mode,
record the intended service/environment ownership and private destination; do not claim it provides
PostgreSQL certificate authentication. Check `/api/health/ready` after release.

On 2026-09-05 a read-only, sanitized inspection of the current Core Railway service found an internal
Railway database hostname and explicit `sslmode=disable`, with no `PGSSLMODE` or explicit policy
variable. This policy preserves that selected mode when Railway identity is available. No production
variables were changed during implementation. Runtime rollout remains gated on integration checks.

Rollback restores the prior application revision and leaves data/schema unchanged. Do not change
production credentials or network topology as an incidental workaround for failed TLS validation.

## Validation evidence

Forty policy regressions cover resolved driver options, private/local restrictions, URL override
rejection, conflicting configuration and DNS/IPv4/IPv6 certificate identity. An independent
disposable PostgreSQL TLS fixture verified encrypted success for a trusted CA and matching DNS
name, rejection without the CA, rejection of an IP URL against a DNS-only certificate, and explicit
local plaintext operation. The IP mismatch initially reproduced with the driver's default identity
check; the application now explicitly binds `checkServerIdentity` to the validated URL hostname.
This is fixture evidence, not a claim that production uses PostgreSQL TLS.
