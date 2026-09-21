import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { captureProduction, inspectRetirementDependencies, parseArgs, railwayArguments } from "./capture-production-account-access.mjs";

const timestamp = "2026-09-21T12:00:00.000Z";
const snapshot = (source, records, extra = {}) => ({ source, capturedAt: timestamp, readOnly: "on", isolation: "repeatable read", records, sha256: "a".repeat(64), ...extra });
const config = (output) => ({ project: "project", environment: "production", core_service: "core", dashboard_service: "dashboard", identity_file: "/private/key", output });

test("requires complete, absolute capture arguments", () => {
  assert.throws(() => parseArgs([]));
  assert.throws(() => parseArgs(["--project", "p", "--environment", "e", "--core-service", "c", "--dashboard-service", "d", "--identity-file", "/key", "--output", "relative.json"]));
  assert.equal(parseArgs(["--project", "p", "--environment", "e", "--core-service", "c", "--dashboard-service", "d", "--identity-file", "/key", "--output", "/private/out.json"]).core_service, "c");
});

test("keeps service credentials remote and produces exclusive private evidence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "p1-production-capture-"));
  try {
    const output = join(dir, "capture.json");
    const calls = [];
    const execute = async (_command, args) => {
      calls.push(args);
      const service = args[args.indexOf("-s") + 1];
      return JSON.stringify(service === "core"
        ? snapshot("core", { accounts: [{ id: "core-owner" }], links: [], forms: [] }, { canonicalEnabled: true })
        : snapshot("dashboard", { accounts: [{ id: "owner" }], clients: [], properties: [], clientAccess: [], workAssignments: [] }));
    };
    const result = await captureProduction(config(output), { execute, environment: {} });
    assert.deepEqual(result.core, { accounts: 1, links: 0, forms: 0 });
    assert.deepEqual(result.dashboard, { accounts: 1, clients: 0, properties: 0, clientAccess: 0, workAssignments: 0 });
    assert.equal(result.canonicalNotificationsEnabled, true);
    assert.equal(calls.length, 2);
    for (const args of calls) {
      assert.equal(args.includes("DATABASE_URL"), false);
      assert.equal(args.includes("p1-account-metadata-readonly"), false);
    }
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    assert.equal(JSON.parse(await readFile(output, "utf8")).notificationRouting.canonicalEnabled, true);
    await assert.rejects(captureProduction(config(output), { execute, environment: {} }));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("rejects unproven remote captures before creating an output", async () => {
  const dir = await mkdtemp(join(tmpdir(), "p1-production-capture-"));
  try {
    const output = join(dir, "capture.json");
    await assert.rejects(captureProduction(config(output), { execute: async () => JSON.stringify(snapshot("core", {}, { readOnly: "off" })), environment: {} }));
    await assert.rejects(stat(output));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("remote Railway arguments execute an encoded bounded program", () => {
  const args = railwayArguments({ ...config("/private/out.json"), service: "dashboard" }, "console.log('safe')");
  assert.deepEqual(args.slice(0, 10), ["ssh", "-p", "project", "-e", "production", "-s", "dashboard", "-i", "/private/key", "node"]);
  assert.match(args.at(-1), /^eval\(Buffer\.from\(/);
});

test("retirement inspection accepts only a verified read-only structural report", async () => {
  const report = await inspectRetirementDependencies(config("/private/out.json"), {
    environment: {},
    execute: async () => JSON.stringify({ readOnly: "on", isolation: "repeatable read", inactiveAccounts: 7, inactiveRoles: [{ role: "member", count: 6 }, { role: "owner", count: 1 }], dependencies: [{ tableName: "session", columns: ["userId"], deleteAction: "c", inactiveReferences: 0, inspection: "complete" }] }),
  });
  assert.equal(report.inactiveAccounts, 7);
  await assert.rejects(inspectRetirementDependencies(config("/private/out.json"), { environment: {}, execute: async () => "{}" }));
});
