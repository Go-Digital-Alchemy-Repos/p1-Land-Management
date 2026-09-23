import { spawn, execFile as exec } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:net";
import { createHash, randomUUID, randomBytes } from "node:crypto";
import { resolve } from "node:path";
const execFile = promisify(exec),
  root = resolve(import.meta.dirname, ".."),
  cwd = resolve(root, "artifacts/api-server");
const suffix = randomUUID().slice(0, 8),
  dbName = "p1-dashboard-test-" + suffix;
let server;
let created = false;
try {
  await execFile("docker", [
    "run",
    "--name",
    dbName,
    "-e",
    "POSTGRES_PASSWORD=p1-test-only",
    "-e",
    "POSTGRES_DB=dashboard_test",
    "-p",
    "127.0.0.1::5432",
    "-d",
    "postgres:17-alpine",
  ]);
  created = true;
  // `docker port` may report a wildcard host (for example `0.0.0.0:49153`)
  // even though the container was explicitly published to loopback. Keep the
  // disposable test URL loopback-only so acceptance fixtures cannot
  // accidentally exercise a non-local database endpoint.
  const databasePort = JSON.parse(
    (
      await execFile("docker", ["inspect", dbName])
    ).stdout,
  )[0].NetworkSettings.Ports["5432/tcp"][0].HostPort;
  const mapping = "127.0.0.1:" + databasePort;
  const temporary = createServer();
  await new Promise((r) => temporary.listen(0, "127.0.0.1", r));
  const port = temporary.address().port;
  await new Promise((r) => temporary.close(r));
  const env = {
    ...process.env,
    DASHBOARD_DATABASE_URL:
      "postgresql://postgres:p1-test-only@" + mapping + "/dashboard_test",
    DASHBOARD_ORIGIN: "http://localhost:" + port,
    DASHBOARD_TEST_ORIGIN: "http://localhost:" + port,
    NODE_ENV: "test",
    PORT: String(port),
    BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
    BOOTSTRAP_OWNER_EMAIL: "owner@example.test",
    BOOTSTRAP_CODE_HASH: createHash("sha256").update("secret").digest("hex"),
    BOOTSTRAP_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
  };
  // Do not inherit any real provider credentials into a synthetic test run.
  for (const name of Object.keys(env))
    if (/^(MAILGUN_|TWILIO_|QBO_|S3_|CORE_FEDERATION_)/.test(name))
      delete env[name];
  Object.assign(env, {
    CORE_FEDERATION_ENABLED: "true",
    CORE_FEDERATION_CLIENT_ID: "p1-core-test-client",
    CORE_FEDERATION_CLIENT_SECRET_CURRENT:
      randomBytes(32).toString("base64url"),
    CORE_FEDERATION_REDIRECT_URI:
      "https://core.example.test/api/auth/federation/callback",
    CORE_FEDERATION_TEST_ALLOW_INSECURE_ORIGIN: "true",
    COMMERCIAL_TEST_DATABASE_URL:
      "postgresql://postgres:p1-test-only@" + mapping + "/dashboard_test",
  });
  // Preserve legacy QuickBooks acceptance coverage. The focused dormant-mode
  // fixture starts its own server with the feature absent instead.
  if (process.argv[2]?.includes("quickbooks-dormant.test.ts"))
    delete env.P1_FEATURE_QUICKBOOKS;
  else env.P1_FEATURE_QUICKBOOKS = "enabled";
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      await execFile("docker", [
        "exec",
        dbName,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-U",
        "postgres",
      ]);
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (!ready) throw new Error("Test database did not become ready");
  await execFile(
    process.execPath,
    ["--import", "tsx", "src/dashboard/migrate.ts"],
    { cwd, env },
  );
  server = spawn(
    process.execPath,
    ["--import", "tsx", "src/dashboard/main.ts"],
    { cwd, env, stdio: ["ignore", "ignore", "pipe"] },
  );
  let logs = "";
  server.stderr.on("data", (b) => {
    logs += b.toString();
  });
  ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(env.DASHBOARD_ORIGIN + "/api/healthz");
      if (r.ok) {
        if (r.headers.get("x-robots-tag") !== "noindex, nofollow")
          throw new Error(
            "Dashboard must exclude operational responses from indexing",
          );
        if (r.headers.get("strict-transport-security") !== "max-age=31536000")
          throw new Error("Dashboard must enforce HTTPS transport policy");
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw new Error("Test server did not become ready: " + logs);
  const result = await execFile(
    process.execPath,
    process.argv[2] ? ["--import", "tsx", "--test", process.argv[2]] : [
      "--import",
      "tsx",
      "--test",
      "--test-concurrency=1",
      "src/dashboard/policy.test.ts",
      "src/dashboard/business-access.test.ts",
      "src/dashboard/sales-access.test.ts",
      "src/dashboard/lead-follow-up.test.ts",
      "src/dashboard/lead-details.test.ts",
      "src/dashboard/crm-archive.test.ts",
      "src/dashboard/lead-onboarding.test.ts",
      "../../scripts/consolidation/import-crm-payloads.test.mjs",
      "../../scripts/consolidation/export-crm-payloads.test.mjs",
      "../../scripts/consolidation/verify-crm-import.test.mjs",
      "src/dashboard/inquiry-list.test.ts",
      "src/dashboard/marketing-reporting.test.ts",
      "src/dashboard/marketing-cms.test.ts",
      "src/dashboard/user-management.test.ts",
      "src/dashboard/impersonation.test.ts",
      "src/dashboard/external-invoice.test.ts",
      "src/dashboard/overview-search.test.ts",
      "src/dashboard/contacts.test.ts",
      "src/dashboard/client-workspace.test.ts",
      "src/dashboard/client-notes.test.ts",
      "src/dashboard/lead-notes.test.ts",
      "src/dashboard/crm-tasks.test.ts",
      "src/dashboard/client-onboarding.test.ts",
      "src/dashboard/assessments.test.ts",
      "src/dashboard/schedule.test.ts",
      "src/dashboard/owner-recovery.test.ts",
      "src/dashboard/core-federation.test.ts",
      "src/dashboard/work-readiness.test.ts",
      "src/dashboard/project-phase.test.ts",
      "src/dashboard/service-request.test.ts",
      "src/dashboard/jobs-lifecycle.test.ts",
      "src/dashboard/estimate-pdf.test.ts",
      "src/dashboard/agreement-template.test.ts",
      "src/dashboard/agreement-standard-templates.test.ts",
      "src/dashboard/agreement-composition.test.ts",
      "src/dashboard/agreement-pricing.test.ts",
      "src/dashboard/composed-estimate-preparation.test.ts",
      "src/dashboard/composed-estimate-preparation.integration.test.ts",
      "src/dashboard/estimate-allocation.test.ts",
      "src/dashboard/commercial-assessment.test.ts",
      "../p1-dashboard/tests/schedule-dates.test.ts",
      "../p1-dashboard/tests/phone.test.ts",
      "../p1-dashboard/tests/dashboard-routes.test.ts",
      "../p1-dashboard/tests/data-load-plan.test.ts",
      "../p1-dashboard/tests/marketing-reports.test.ts",
      "../p1-dashboard/tests/dashboard-contract.test.ts",
      "../p1-dashboard/tests/property-coordinates.test.ts",
      "../p1-dashboard/tests/service-request-triage.test.ts",
      "src/dashboard/integration.test.ts",
      "src/dashboard/profile-avatar.test.ts",
      "src/dashboard/property-update-geocoding.test.ts",
    ],
    { cwd, env },
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  const checkExternalInvoiceRecovery = !process.argv[2] || process.argv[2].includes("external-invoice.test.ts");
  const externalInvoiceCount = async () => Number((await execFile("docker", [
    "exec", dbName, "psql", "-U", "postgres", "-d", "dashboard_test", "-Atc",
    "SELECT count(*) FROM billing_draft_external_invoice",
  ])).stdout.trim());
  const recordedBeforeReplay = checkExternalInvoiceRecovery ? await externalInvoiceCount() : null;
  if (checkExternalInvoiceRecovery && !recordedBeforeReplay)
    throw new Error("External-invoice fixture did not create a durable record");
  // Verify that the migration runner is idempotent against a populated database.
  await execFile(
    process.execPath,
    ["--import", "tsx", "src/dashboard/migrate.ts"],
    { cwd, env },
  );
  if (checkExternalInvoiceRecovery) {
    const recordedAfterReplay = await externalInvoiceCount();
    if (recordedAfterReplay !== recordedBeforeReplay)
      throw new Error("External-invoice records changed during migration replay");
    console.log(`External-invoice recovery replay retained ${recordedAfterReplay} synthetic record(s).`);
  }
  console.log("Migration replay passed. All data was synthetic.");
} catch (error) {
  console.error([error.stdout, error.stderr].filter(Boolean).join("\n") || error.message);
  process.exitCode = 1;
} finally {
  if (server) {
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
  }
  if (created) await execFile("docker", ["rm", "-f", dbName]);
}
