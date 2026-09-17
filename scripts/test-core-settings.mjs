import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
const exec = promisify(execFile);
const name = "p1-settings-test-" + randomUUID().slice(0, 8);
const password = randomUUID();
let created = false;
try {
  await exec("docker", [
    "run",
    "--detach",
    "--rm",
    "--name",
    name,
    "-e",
    "POSTGRES_DB=core_settings_test",
    "-e",
    `POSTGRES_PASSWORD=${password}`,
    "-p",
    "127.0.0.1::5432",
    "postgres:17-alpine",
  ]);
  created = true;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      await exec("docker", ["exec", name, "pg_isready", "-U", "postgres"]);
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (!ready) throw Error("Synthetic settings database did not start");
  const inspect = JSON.parse((await exec("docker", ["inspect", name])).stdout);
  const port = inspect[0].NetworkSettings.Ports["5432/tcp"][0].HostPort;
  const env = {
    ...process.env,
    SETTINGS_TEST_DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/core_settings_test`,
  };
  const result = await exec(
    "npx",
    ["vitest", "run", "server/__tests__/settings-atomic.db.test.ts"],
    {
      cwd: resolve(import.meta.dirname, "../platform/p1-core"),
      env,
      maxBuffer: 5 * 1024 * 1024,
    },
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
} catch (error) {
  // Report test output, never the environment or connection string.
  if (error.stdout) process.stdout.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  console.error("Disposable settings validation failed.");
  process.exitCode = 1;
} finally {
  if (created) await exec("docker", ["rm", "--force", name]);
}
