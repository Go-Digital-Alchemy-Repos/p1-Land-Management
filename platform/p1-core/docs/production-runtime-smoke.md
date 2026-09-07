# Compiled production runtime gate

Run `npm run build`, then:

```sh
python3 script/verify-production-runtime.py --output /tmp/production-runtime-smoke.json
```

The gate requires Python 3.9+, OpenSSL, and a local Docker daemon reachable through a Unix socket. It uses official PostgreSQL 16 Alpine and Node 22 Alpine images. Node 22 matches the configured deployment runtime; the exact resolved version is recorded in the evidence. Image download and locked package installation need registry access.

Each run creates uniquely named, disposable containers with no published ports. A generated one-day CA signs a localhost/IP certificate. The application shares only the fixture database's network namespace and connects to PostgreSQL over loopback with `DATABASE_TLS_MODE=verify-full` and the generated trusted CA. It never weakens production TLS policy or supplies a fake Railway identity. Application configuration is an explicit synthetic allowlist; host provider credentials and `.env` files are not copied.

The Linux application installs the complete production dependency graph using `npm ci --omit=dev` and the repository lockfile. This takes longer than installing Sharp alone but verifies the actual locked native package and production dependency layout. It receives `dist/` and `docs/`, matching the source documentation retained by Railpack. The gate checks the installed Sharp version and the SHA-256 of the copied compiled bundle.

After installation, the launcher uses `exec env NODE_ENV=production node dist/index.cjs`. The gate verifies Node is PID 1, waits for actual readiness with a connected database, and queries PostgreSQL's TLS connection statistics. It then sends SIGTERM to PID 1 and requires a successful exit plus exactly the `draining` and `drained` shutdown events. This exercises compiled production startup; development browser tests do not catch bundling failures such as Sharp's ESM loader losing `import.meta.url` when bundled into CJS.

Readiness has a 180-second deadline including dependency installation. A bounded readiness-probe timeout retries observation of the same container within that deadline; it does not restart the app or declare failure on that observation alone. Application drain is 30 seconds with a 35-second observer deadline. Other commands and image pulls have explicit timeouts. SIGINT/SIGTERM enter cleanup, and cleanup attempts each owned container independently, including anonymous volumes. The JSON report records cleanup outcomes and fails if cleanup is incomplete. No existing container, database, or production setting is reused or modified.

For regression verification, `--bundle /absolute/path/to/alternative/index.cjs` substitutes only a compiled server entry in the fixture. A negative control built with Sharp bundled should fail before readiness; the candidate with Sharp externalized should pass. This option does not modify the normal build output.

The report is suitable for a CI artifact. A passing smoke proves startup, verified database TLS, and idle graceful termination for that bundle. It complements the separate tests for active HTTP requests, in-flight worker drainage, and forced deadlines; it does not replace Railway's own termination-grace verification or client release gates.
