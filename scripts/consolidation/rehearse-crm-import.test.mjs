import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArguments, postgresArguments, workerArguments } from "./rehearse-crm-import.mjs";
import { assertWorkerEnvironment } from "./rehearse-crm-import-worker.mjs";

test("rehearsal requires explicit synthetic approval and a new absolute evidence target", () => {
  assert.deepEqual(parseArguments(["--approve-synthetic-fixture", "--output", "/tmp/p1-rehearsal"]), { output: "/tmp/p1-rehearsal" });
  for (const args of [[], ["--output", "/tmp/result"], ["--approve-synthetic-fixture", "--output", "relative"],
    ["--approve-synthetic-fixture", "--output", "/tmp/result,target=/elsewhere"],
    ["--approve-synthetic-fixture", "--output", "/tmp/result", "--database", "postgres://remote/live"],
    ["--approve-synthetic-fixture", "--input", "/tmp/real-data.json"]]) assert.throws(() => parseArguments(args));
});

test("PostgreSQL has no host ports, host mounts or external network", () => {
  const args = postgresArguments("p1-crm-rehearsal-acde-1234");
  assert.equal(args[args.indexOf("--network") + 1], "none");
  assert(args.includes("--tmpfs"));
  assert(args.includes("--pull=never"));
  for (const unsafe of ["-p", "--publish", "--publish-all", "--mount", "-v", "--env-file", "--privileged"]) assert(!args.includes(unsafe));
  assert.throws(() => postgresArguments("production"));
});

test("worker shares only the isolated namespace and receives no provider environment", () => {
  const args = workerArguments("p1-crm-rehearsal-acde-1234", "/tmp/stage", "/tmp/result", "restore", "/repo");
  assert.equal(args[args.indexOf("--network") + 1], "container:p1-crm-rehearsal-acde-1234");
  assert(args.includes("--read-only"));
  assert(args.includes("--cap-drop=ALL"));
  assert.deepEqual(args.filter((value, index) => args[index - 1] === "-e"), ["P1_SYNTHETIC_CRM_REHEARSAL=approved-fixture-only"]);
  assert(args.includes("type=bind,source=/tmp/stage,target=/workspace,readonly"));
  assert(!args.some(value => value.includes("docker.sock")));
  assert.throws(() => workerArguments("production", "/tmp/stage", "/tmp/result", "restore"));
  assert.throws(() => workerArguments("p1-crm-rehearsal-acde", "/tmp/stage", "/tmp/result", "send-email"));
});

test("worker refuses unexpected phase or connection environment", () => {
  const allowed = { P1_SYNTHETIC_CRM_REHEARSAL: "approved-fixture-only" };
  assert.doesNotThrow(() => assertWorkerEnvironment("import", allowed));
  assert.doesNotThrow(() => assertWorkerEnvironment("restore", allowed));
  assert.throws(() => assertWorkerEnvironment("import", {}));
  assert.throws(() => assertWorkerEnvironment("production", allowed));
  for (const key of ["DATABASE_URL", "DASHBOARD_DATABASE_URL", "PGHOST", "PGSERVICE", "PGSERVICEFILE", "PGOPTIONS"]) {
    assert.throws(() => assertWorkerEnvironment("restore", { ...allowed, [key]: "unexpected" }));
  }
});
