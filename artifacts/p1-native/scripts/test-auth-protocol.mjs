import { execFile as exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, symlink, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { randomUUID, randomBytes, createHash } from "node:crypto";
const run = promisify(exec),
  native = resolve(import.meta.dirname, ".."),
  root = resolve(native, "../.."),
  revision = "49485adc464a6545aea54ab3a56f2fbdabdfa7fa";
const archive = await mkdtemp(resolve(tmpdir(), "p1-native-auth-")),
  db = "p1-native-auth-" + randomUUID().slice(0, 8);
let created = false,
  server;
try {
  const { stdout } = await run(
    "git",
    [
      "archive",
      revision,
      "artifacts/api-server",
      "lib",
      "package.json",
      "tsconfig.json",
    ],
    { cwd: root, encoding: "buffer", maxBuffer: 50 * 1024 * 1024 },
  );
  await writeFile(resolve(archive, "source.tar"), stdout);
  await run("tar", ["-xf", resolve(archive, "source.tar"), "-C", archive]);
  await symlink(
    resolve(root, "node_modules"),
    resolve(archive, "node_modules"),
  );
  await symlink(
    resolve(root, "artifacts/api-server/node_modules"),
    resolve(archive, "artifacts/api-server/node_modules"),
  );
  await run("docker", [
    "run",
    "--name",
    db,
    "-e",
    "POSTGRES_PASSWORD=native-test-only",
    "-e",
    "POSTGRES_DB=native",
    "-p",
    "127.0.0.1::5432",
    "-d",
    "postgres:17-alpine",
  ]);
  created = true;
  const mapping = (await run("docker", ["port", db, "5432"])).stdout.trim();
  const socket = createServer();
  await new Promise((r) => socket.listen(0, "127.0.0.1", r));
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const env = {
    ...process.env,
    DASHBOARD_DATABASE_URL:
      "postgresql://postgres:native-test-only@" + mapping + "/native",
    DASHBOARD_ORIGIN: "http://localhost:" + port,
    DASHBOARD_TEST_ORIGIN: "http://localhost:" + port,
    P1_API_ARCHIVE: archive,
    PORT: String(port),
    BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
    BOOTSTRAP_OWNER_EMAIL: "owner@example.test",
    BOOTSTRAP_CODE_HASH: createHash("sha256").update("secret").digest("hex"),
    BOOTSTRAP_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
  };
  for (const name of Object.keys(env))
    if (/^(MAILGUN_|TWILIO_|QBO_|S3_|CORE_INGRESS_)/.test(name))
      delete env[name];
  for (let i = 0; i < 50; i++) {
    try {
      await run("docker", [
        "exec",
        db,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-U",
        "postgres",
      ]);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  const cwd = resolve(archive, "artifacts/api-server");
  await run(process.execPath, ["--import", "tsx", "src/dashboard/migrate.ts"], {
    cwd,
    env,
  });
  server = spawn(
    process.execPath,
    ["--import", "tsx", "src/dashboard/main.ts"],
    { cwd, env, stdio: ["ignore", "ignore", "pipe"] },
  );
  let error = "";
  server.stderr.on("data", (b) => (error += b));
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(env.DASHBOARD_ORIGIN + "/api/healthz")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) throw new Error("Isolated API startup failed");
  const result = await run(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      resolve(native, "integration/auth-protocol.test.ts"),
    ],
    { cwd, env },
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  console.log(
    "Protocol API revision " +
      revision +
      "; disposable synthetic database only.",
  );
} catch (error) {
  console.error(error.stdout || error.message);
  process.exitCode = 1;
} finally {
  if (server) {
    server.kill();
    await new Promise((r) => server.once("exit", r));
  }
  if (created) await run("docker", ["rm", "-f", db]);
}
