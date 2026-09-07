import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
const name = "p1-commercial-test-" + randomUUID().slice(0, 8),
  password = randomUUID();
const run = (command, args, options = {}) =>
  execFileSync(command, args, { encoding: "utf8", ...options });
let created = false;
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
      "POSTGRES_DB=commercial_bridge_test",
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
  const url = `postgresql://postgres:${password}@127.0.0.1:${port}/commercial_bridge_test`;
  const env = {
    ...process.env,
    DASHBOARD_DATABASE_URL: url,
    COMMERCIAL_TEST_DATABASE_URL: url,
    BETTER_AUTH_SECRET: randomUUID() + randomUUID(),
    DASHBOARD_ORIGIN: "http://localhost:4180",
  };
  const cwd = resolve("artifacts/api-server");
  for (const args of [
    ["exec", "tsx", "src/dashboard/migrate.ts"],
    ["exec", "tsx", "src/dashboard/migrate.ts"],
    ["exec", "tsx", "--test", "src/dashboard/prospect-context.test.ts"],
  ]) {
    const result = spawnSync("pnpm", args, { cwd, env, stdio: "inherit" });
    if (result.status !== 0)
      throw Error("Commercial regression command failed");
  }
  console.log(
    "PASS isolated commercial migrations/replay and prospect linking and operational-boundary regressions; no live provider",
  );
} finally {
  if (created) run("docker", ["rm", "-f", name], { stdio: "ignore" });
}
