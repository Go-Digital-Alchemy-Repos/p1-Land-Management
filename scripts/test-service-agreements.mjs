import { execFileSync, spawnSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
const name = "p1-agreement-test-" + randomUUID().slice(0, 8),
  password = randomUUID();
const run = (command, args, options = {}) =>
  execFileSync(command, args, { encoding: "utf8", ...options });
let created = false;
let server;
try {
  run(
    "docker",
    [
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_DB=agreement_test",
      "-e",
      "POSTGRES_PASSWORD=" + password,
      "-p",
      "127.0.0.1::5432",
      "postgres:16-alpine",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  created = true;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      run("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
        stdio: "ignore",
      });
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!ready) throw Error("Disposable database not ready");
  const port = JSON.parse(run("docker", ["inspect", name]))[0].NetworkSettings
    .Ports["5432/tcp"][0].HostPort;
  const url = `postgresql://postgres:${password}@127.0.0.1:${port}/agreement_test`;
  const listener = createServer();
  await new Promise((r) => listener.listen(0, "127.0.0.1", r));
  const httpPort = listener.address().port;
  await new Promise((r) => listener.close(r));
  const env = {
    ...process.env,
    DASHBOARD_DATABASE_URL: url,
    AGREEMENT_TEST_DATABASE_URL: url,
    BETTER_AUTH_SECRET: randomUUID() + randomUUID(),
    DASHBOARD_ORIGIN: "http://localhost:" + httpPort,
    DASHBOARD_TEST_ORIGIN: "http://localhost:" + httpPort,
    PORT: String(httpPort),
  };
  for (const name of Object.keys(env))
    if (/^(MAILGUN_|TWILIO_|QBO_|S3_)/.test(name)) delete env[name];
  const cwd = resolve("artifacts/api-server");
  for (const args of [
    ["exec", "tsx", "src/dashboard/migrate.ts"],
    ["exec", "tsx", "src/dashboard/migrate.ts"],
    [
      "exec",
      "tsx",
      "--test",
      "src/dashboard/service-agreement.schema.test.ts",
      "src/dashboard/service-agreement.test.ts",
      "src/dashboard/service-agreement.contract.test.ts",
      "src/dashboard/service-agreement.billing.test.ts",
    ],
  ]) {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", ...args.slice(2)],
      { cwd, env, stdio: "inherit" },
    );
    if (result.status !== 0) throw Error("Agreement regression command failed");
  }
  server = spawn(
    process.execPath,
    ["--import", "tsx", "src/dashboard/main.ts"],
    { cwd, env, stdio: ["ignore", "ignore", "pipe"] },
  );
  let errors = "";
  server.stderr.on("data", (chunk) => {
    errors += chunk.toString();
  });
  let httpReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(env.DASHBOARD_ORIGIN + "/api/healthz")).ok) {
        httpReady = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!httpReady) throw Error("Agreement HTTP server unavailable: " + errors);
  const http = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      "src/dashboard/service-agreement.http.test.ts",
    ],
    { cwd, env, stdio: "inherit" },
  );
  if (http.status !== 0) throw Error("Agreement HTTP regression failed");
  console.log(
    "PASS isolated service agreement migrations, replay and lifecycle/cap/overlap regressions; no live provider",
  );
} finally {
  if (server && server.exitCode === null) {
    const exited = new Promise((r) => server.once("exit", r));
    server.kill("SIGTERM");
    await exited;
  }
  if (created) run("docker", ["rm", "-f", name], { stdio: "ignore" });
}
