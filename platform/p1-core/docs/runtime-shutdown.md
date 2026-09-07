# Runtime shutdown and deployment replacement

Core handles SIGTERM and SIGINT through one idempotent runtime lifecycle. The first signal immediately marks the instance as draining. New requests, including readiness requests on existing connections, receive HTTP 503 with `reason: shutting_down`; the listener stops accepting connections. A readiness check already awaiting PostgreSQL checks shutdown again before reporting ready.

The runtime stops the seven scheduled workers (CMS publishing, event reminders, backups, directory membership lifecycle, ecommerce notifications, managed-form effects, and inventory reservation expiry). Each returns a real drain promise. Timers stop immediately, no further batch item is claimed, and the current claimed item or transaction is allowed to settle. Stopping a timer does not cancel an in-flight provider request or database transaction. Publication and reminder bookkeeping already started still completes as appropriate.

HTTP connections, startup work, and registered workers drain before the shared PostgreSQL pool closes. A signal during migrations, search-index initialization, or bootstrap prevents the listener from starting afterward. Resources registered during startup after the signal are stopped and included in drainage. Development Vite also registers its watcher/HMR close hook.

`SHUTDOWN_TIMEOUT_MS` defaults to 30000 and accepts integer milliseconds from 1000 through 300000. The deadline covers the entire shutdown, including pool closure. If it expires, accepted sockets (including upgrades) are destroyed and the process exits with code 1. Otherwise shutdown exits with code 0, or code 1 if startup/resource/pool closure failed. Repeated signals reuse the original shutdown and deadline rather than closing resources twice or restarting the timer.

Before deploying, set the hosting platform's termination grace **longer than** `SHUTDOWN_TIMEOUT_MS`, with margin for routing and process teardown. Railway's configured deployment termination grace must be verified separately; the application does not configure it. A provider allowed 30 seconds to respond cannot be guaranteed to finish inside a 30-second shutdown budget. Increase both application and platform grace together when required, or accept the documented forced-stop behavior.

Forced termination can interrupt an external send after the provider accepts it but before job completion commits. Durable jobs retain their existing lease/retry recovery; external delivery remains at least once. PostgreSQL disconnect rolls back an open transaction and releases connection/session locks. This is not a guarantee that every request or external operation completes on every replacement.

Inspection found no instantiated express-session/connect-pg-simple/memorystore cleanup timers in runtime server source; those packages are dependencies only. Search-index initialization is awaited and installs database triggers, not a Node polling timer. Retry/provider timeout timers belong to their in-flight operations and are not independently cancelled during drain. Existing fire-and-forget tasks outside tracked HTTP/worker lifetimes are not converted into durable work by this change; a global registry of detached work remains separate scope.

Validation uses real localhost HTTP sockets to check in-flight responses, pipelined readiness 503, worker drainage before pool closure, startup-time signals, repeated signals, forced socket teardown, and a pool shutdown that exceeds the deadline. Worker tests verify completion of the current claimed job without claiming the next one. No production signals or deployment settings were changed by these tests.

## Railway configuration evidence

The September 5 read-only inspection of deployment `3d85b969-b2f7-4e0d-a774-34d6fb4e4144`
found `drainingSeconds=null`, `startCommand="npm start"`, and no service drain/deadline overrides.
Railway's [variable reference](https://docs.railway.com/variables/reference) documents a zero-second
default. The candidate `railway.toml` therefore sets 45 seconds of draining for the default
30-second application deadline. Its direct `env NODE_ENV=production node dist/index.cjs` start
command replaces the package-manager wrapper; `env` executes Node with production mode set.
Railway documents the package-manager signal issue in its
[Node signal guide](https://docs.railway.com/deployments/troubleshooting/nodejs-sigterm-handling).

Before release, reject any service override that shortens platform drain below the application
deadline. After release, inspect the effective deployment manifest and observe a controlled
replacement's draining/drained logs. The repository change is not evidence that the live service
has adopted these settings. Do not send test shutdown signals to production.
