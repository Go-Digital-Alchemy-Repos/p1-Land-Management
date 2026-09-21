import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import { queries } from "./capture-account-access.mjs";

const fail = (message) => {
  throw Error(message);
};

function argument(name, value) {
  if (!value || value.startsWith("--")) fail(`Missing ${name}`);
  return value;
}

export function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!key?.startsWith("--") || values.has(key)) fail("Invalid capture arguments");
    values.set(key, argument(key, args[index + 1]));
  }
  const required = ["--project", "--environment", "--core-service", "--dashboard-service", "--identity-file", "--output"];
  if (values.size !== required.length || required.some((key) => !values.has(key))) fail("Invalid capture arguments");
  const output = values.get("--output");
  if (!isAbsolute(output)) fail("Capture output must be an absolute private path");
  return Object.fromEntries([...values.entries()].map(([key, value]) => [key.slice(2).replaceAll("-", "_"), value]));
}

function remoteProgram(source) {
  const sourceQueries = queries[source];
  if (!sourceQueries) fail("Unknown capture source");
  const databaseVariable = source === "dashboard" ? "DASHBOARD_DATABASE_URL" : "DATABASE_URL";
  return `
const { Client } = require("pg");
const { createHash } = require("crypto");
const queries = ${JSON.stringify(sourceQueries)};
(async () => {
  let stage = "capture";
  const connectionString = process.env[${JSON.stringify(databaseVariable)}];
  if (!connectionString) throw Object.assign(Error("Database connection setting unavailable"), { code: "DB_CONFIG_MISSING" });
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000, application_name: "p1-account-metadata-readonly" });
  await client.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SET LOCAL lock_timeout = '3s'");
    const evidence = (await client.query("SELECT current_timestamp AS \\\"capturedAt\\\", current_setting('transaction_read_only') AS \\\"readOnly\\\", current_setting('transaction_isolation') AS isolation")).rows[0];
    if (evidence.readOnly !== "on" || evidence.isolation !== "repeatable read") throw Error("Read-only snapshot not established");
    const records = {};
    for (const [key, sql] of Object.entries(queries)) records[key] = (await client.query(sql)).rows;
    await client.query("COMMIT");
    const snapshot = { source: ${JSON.stringify(source)}, ...evidence, records };
    const result = { ...snapshot, sha256: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") };
    ${source === "core" ? "result.canonicalEnabled = process.env.CORE_DASHBOARD_FORM_NOTIFICATIONS_ENABLED === \"true\";" : ""}
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error && typeof error === "object") error.stage = stage;
    throw error;
  } finally { await client.end(); }
})().catch((error) => {
  const code = typeof error?.code === "string" && /^[A-Z0-9_]{1,20}$/.test(error.code) ? " [" + error.code + "]" : "";
  process.stderr.write("Account metadata capture failed; no account changes were attempted." + code + "\\n");
  process.exitCode = 1;
});
`;
}

export function railwayArguments({ project, environment, service, identity_file }, program) {
  return [
    "ssh", "-p", project, "-e", environment, "-s", service, "-i", identity_file,
    "node", "-e", Buffer.from(program).toString("base64").replace(/.+/, (encoded) => `eval(Buffer.from(${JSON.stringify(encoded)}, \"base64\").toString())`),
  ];
}

export function run(command, args, environment) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { env: environment, stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [], errors = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolveRun(Buffer.concat(chunks).toString("utf8"))
      : reject(Error(`Remote capture failed (${code ?? "unknown"}): ${Buffer.concat(errors).toString("utf8").trim() || "no detail"}`)));
  });
}

function parseSnapshot(raw, source) {
  let snapshot;
  try { snapshot = JSON.parse(raw); } catch { fail("Remote capture returned invalid JSON"); }
  if (!snapshot || snapshot.source !== source || !snapshot.records || snapshot.readOnly !== "on" || snapshot.isolation !== "repeatable read" || !/^[a-f0-9]{64}$/.test(snapshot.sha256 || "")) fail("Remote capture did not prove its bounded read-only snapshot");
  return snapshot;
}

export async function captureProduction(config, { command = "railway", environment = process.env, execute = run } = {}) {
  const safeEnvironment = {
    ...environment,
    RAILWAY_CALLER: "skill:use-railway@1.3.0",
    RAILWAY_AGENT_SESSION: environment.RAILWAY_AGENT_SESSION || "p1-account-access-capture",
  };
  const [coreRaw, dashboardRaw] = await Promise.all([
    execute(command, railwayArguments({ ...config, service: config.core_service }, remoteProgram("core")), safeEnvironment),
    execute(command, railwayArguments({ ...config, service: config.dashboard_service }, remoteProgram("dashboard")), safeEnvironment),
  ]);
  const core = parseSnapshot(coreRaw, "core");
  const dashboard = parseSnapshot(dashboardRaw, "dashboard");
  const inventory = {
    schemaVersion: 1,
    purpose: "unreviewed-account-access-capture",
    core: { source: core.source, capturedAt: core.capturedAt, readOnly: core.readOnly, isolation: core.isolation, records: core.records, sha256: core.sha256 },
    dashboard: { source: dashboard.source, capturedAt: dashboard.capturedAt, readOnly: dashboard.readOnly, isolation: dashboard.isolation, records: dashboard.records, sha256: dashboard.sha256 },
    notificationRouting: { canonicalEnabled: core.canonicalEnabled === true, legacyRecipientsDisposition: "pending" },
    review: null,
    sourceFreezeVerified: false,
    releaseApproval: false,
  };
  const output = resolve(config.output);
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  await writeFile(output, `${JSON.stringify(inventory, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return {
    outputSha256: createHash("sha256").update(JSON.stringify(inventory)).digest("hex"),
    core: Object.fromEntries(Object.entries(core.records).map(([key, rows]) => [key, rows.length])),
    dashboard: Object.fromEntries(Object.entries(dashboard.records).map(([key, rows]) => [key, rows.length])),
    canonicalNotificationsEnabled: core.canonicalEnabled === true,
  };
}

function retirementInspectionProgram() {
  return `
const { Client } = require("pg");
(async () => {
  let stage = "connection";
  const connectionString = process.env.DASHBOARD_DATABASE_URL;
  if (!connectionString) throw Object.assign(Error("Database connection setting unavailable"), { code: "DB_CONFIG_MISSING" });
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000, application_name: "p1-account-retirement-readonly" });
  await client.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SET LOCAL lock_timeout = '3s'");
    const evidence = (await client.query("SELECT current_setting('transaction_read_only') AS \\\"readOnly\\\", current_setting('transaction_isolation') AS isolation")).rows[0];
    if (evidence.readOnly !== "on" || evidence.isolation !== "repeatable read") throw Error("Read-only snapshot not established");
    stage = "inactive_accounts";
    const inactive = (await client.query("SELECT u.id FROM \\\"user\\\" u JOIN staff_profile p ON p.user_id=u.id WHERE p.active=false ORDER BY u.id")).rows.map(row => row.id);
    stage = "inactive_roles";
    const roles = (await client.query("SELECT p.role,COUNT(*)::int AS count FROM staff_profile p WHERE p.active=false GROUP BY p.role ORDER BY p.role")).rows;
    stage = "foreign_keys";
    const dependencies = (await client.query("SELECT c.conrelid::regclass::text AS \\\"tableName\\\",json_agg(a.attname ORDER BY key.ordinality) AS columns,json_agg(a.atttypid::regtype::text ORDER BY key.ordinality) AS types,c.confdeltype AS \\\"deleteAction\\\" FROM pg_constraint c JOIN LATERAL unnest(c.conkey::smallint[]) WITH ORDINALITY AS key(attnum,ordinality) ON true JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=key.attnum WHERE c.contype='f' AND c.confrelid='\\\"user\\\"'::regclass::oid GROUP BY c.oid,c.conrelid,c.confdeltype ORDER BY c.conrelid::regclass::text,c.oid")).rows;
    const quote = value => '\\\"' + String(value).replaceAll('\\\"','\\\"\\\"') + '\\\"';
    const references = [];
    for (const dependency of dependencies) {
      if (dependency.columns.length !== 1 || dependency.types.length !== 1) {
        references.push({ tableName: dependency.tableName, columns: dependency.columns, deleteAction: dependency.deleteAction, inactiveReferences: null, inspection: "manual_required" });
        continue;
      }
      stage = "dependency_count";
      const count = (await client.query('SELECT COUNT(*)::int AS count FROM ' + dependency.tableName + ' WHERE ' + quote(dependency.columns[0]) + '::text=ANY($1::text[])', [inactive])).rows[0].count;
      references.push({ tableName: dependency.tableName, columns: dependency.columns, deleteAction: dependency.deleteAction, inactiveReferences: count, inspection: "complete" });
    }
    await client.query("COMMIT");
    process.stdout.write(JSON.stringify({ readOnly: evidence.readOnly, isolation: evidence.isolation, inactiveAccounts: inactive.length, inactiveRoles: roles, dependencies: references }));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error && typeof error === "object") error.stage = stage;
    throw error;
  } finally { await client.end(); }
})().catch((error) => {
  const code = typeof error?.code === "string" && /^[A-Z0-9_]{1,20}$/.test(error.code) ? " [" + error.code + "]" : "";
  const name = typeof error?.name === "string" && /^[A-Za-z]{1,40}$/.test(error.name) ? " " + error.name : "";
  const stage = typeof error?.stage === "string" && /^[a-z_]{1,40}$/.test(error.stage) ? " " + error.stage : "";
  const safeMessages = new Set(["Database connection setting unavailable", "Read-only snapshot not established"]);
  const detail = safeMessages.has(error?.message) || error?.code === "42883" ? " " + error.message : "";
  process.stderr.write("Account retirement inspection failed; no account changes were attempted." + name + code + stage + detail + "\\n");
  process.exitCode = 1;
});
`;
}

export async function inspectRetirementDependencies(config, { command = "railway", environment = process.env, execute = run } = {}) {
  const safeEnvironment = {
    ...environment,
    RAILWAY_CALLER: "skill:use-railway@1.3.0",
    RAILWAY_AGENT_SESSION: environment.RAILWAY_AGENT_SESSION || "p1-account-retirement-inspection",
  };
  const raw = await execute(command, railwayArguments({ ...config, service: config.dashboard_service }, retirementInspectionProgram()), safeEnvironment);
  let report;
  try { report = JSON.parse(raw); } catch { fail("Retirement inspection returned invalid JSON"); }
  if (!report || report.readOnly !== "on" || report.isolation !== "repeatable read" || !Number.isInteger(report.inactiveAccounts) || !Array.isArray(report.inactiveRoles) || !Array.isArray(report.dependencies)) fail("Retirement inspection did not prove a bounded read-only result");
  return report;
}

async function main() {
  const result = await captureProduction(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify({ captured: true, ...result })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const detail = error instanceof Error ? error.message : "unknown failure";
    process.stderr.write(`Account metadata capture failed; no account changes were attempted. ${detail}\n`);
    process.exitCode = 1;
  });
}
