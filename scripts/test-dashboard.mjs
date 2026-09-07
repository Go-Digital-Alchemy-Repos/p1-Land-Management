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
    "POSTGRES_DB=dashboard",
    "-p",
    "127.0.0.1::5432",
    "-d",
    "postgres:17-alpine",
  ]);
  created = true;
  const mapping = (
    await execFile("docker", ["port", dbName, "5432"])
  ).stdout.trim();
  const temporary = createServer();
  await new Promise((r) => temporary.listen(0, "127.0.0.1", r));
  const port = temporary.address().port;
  await new Promise((r) => temporary.close(r));
  const env = {
    ...process.env,
    DASHBOARD_DATABASE_URL:
      "postgresql://postgres:p1-test-only@" + mapping + "/dashboard",
    DASHBOARD_ORIGIN: "http://localhost:" + port,
    DASHBOARD_TEST_ORIGIN: "http://localhost:" + port,
    PORT: String(port),
    BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
    BOOTSTRAP_OWNER_EMAIL: "owner@example.test",
    BOOTSTRAP_CODE_HASH: createHash("sha256").update("secret").digest("hex"),
    BOOTSTRAP_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
  };
  // Do not inherit any real provider credentials into a synthetic test run.
  for (const name of Object.keys(env))
    if (/^(MAILGUN_|TWILIO_|QBO_|S3_)/.test(name)) delete env[name];
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      await execFile("docker", [
        "exec",
        dbName,
        "pg_isready",
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
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw new Error("Test server did not become ready: " + logs);
  const result = await execFile(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      "src/dashboard/policy.test.ts",
      "src/dashboard/contacts.test.ts",
      "src/dashboard/assessments.test.ts",
      "src/dashboard/schedule.test.ts",
      "src/dashboard/owner-recovery.test.ts",
      "../p1-dashboard/tests/schedule-dates.test.ts",
      "../p1-dashboard/tests/dashboard-contract.test.ts",
      "src/dashboard/integration.test.ts",
    ],
    { cwd, env },
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  // Verify that the migration runner is idempotent against a populated database.
  await execFile(
    process.execPath,
    ["--import", "tsx", "src/dashboard/migrate.ts"],
    { cwd, env },
  );
  console.log("Migration replay passed. All data was synthetic.");
} catch (error) {
  console.error(error.stdout || error.message);
  process.exitCode = 1;
} finally {
  if (server) {
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
  }
  if (created) await execFile("docker", ["rm", "-f", dbName]);
}
