import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const hash = value => createHash("sha256").update(value).digest("hex");
const postgresImage = "postgres:18-alpine";
const nodeImage = "node:22-alpine";
const copiedScripts = ["rehearse-crm-import-worker.mjs", "crm-import-fixture.mjs", "crm-payload-fixture.mjs",
  "prepare-crm-payloads.mjs", "reconcile-crm.mjs", "import-crm-payloads.mjs", "verify-crm-import.mjs"];

export function parseArguments(args) {
  if (args.length !== 3 || args[0] !== "--approve-synthetic-fixture" || args[1] !== "--output" ||
      !isAbsolute(args[2]) || /[\r\n,]/.test(args[2])) {
    throw Error("Use --approve-synthetic-fixture --output /absolute/new/evidence-directory");
  }
  return { output: resolve(args[2]) };
}

export function postgresArguments(name) {
  if (!/^p1-crm-rehearsal-[a-f0-9-]+$/.test(name)) throw Error("Invalid disposable container name");
  return ["run", "-d", "--rm", "--pull=never", "--name", name, "--network", "none",
    "--tmpfs", "/var/lib/postgresql:rw,noexec,nosuid,size=1024m", "--memory", "1g", "--cpus", "2",
    "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "-e", "POSTGRES_DB=crm_rehearsal", postgresImage];
}

export function workerArguments(name, stage, output, mode, dependencyRoot = root) {
  postgresArguments(name); // validate generated name before sharing its namespace
  if (!["import", "restore"].includes(mode)) throw Error("Invalid rehearsal phase");
  return ["run", "--rm", "--pull=never", "--network", `container:${name}`, "--read-only", "--cap-drop=ALL",
    "--security-opt", "no-new-privileges", "--memory", "512m", "--cpus", "2", "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m",
    "--mount", `type=bind,source=${stage},target=/workspace,readonly`,
    "--mount", `type=bind,source=${join(dependencyRoot, "node_modules")},target=/workspace/node_modules,readonly`,
    "--mount", `type=bind,source=${join(dependencyRoot, "artifacts/api-server/node_modules")},target=/workspace/artifacts/api-server/node_modules,readonly`,
    "--mount", `type=bind,source=${output},target=/evidence`,
    "-e", "P1_SYNTHETIC_CRM_REHEARSAL=approved-fixture-only", nodeImage,
    "node", "/workspace/scripts/consolidation/rehearse-crm-import-worker.mjs", mode];
}

export async function runRehearsal(args) {
  const { output } = parseArguments(args);
  // Refuse remote Docker engines; no caller-supplied database or archive is accepted.
  const dockerEnv = { PATH: process.env.PATH, HOME: process.env.HOME };
  async function docker(argv) {
    try { return (await exec("docker", argv, { env: dockerEnv, encoding: "buffer", timeout: 180000, maxBuffer: 64 * 1024 * 1024 })).stdout; }
    catch { throw Error(`Synthetic rehearsal Docker step failed (${argv[0]}); no acceptance claimed`); }
  }
  const context = JSON.parse((await docker(["context", "inspect"])).toString());
  if (!context[0]?.Endpoints?.docker?.Host?.startsWith("unix://")) throw Error("A local Docker Unix socket context is required");
  const imageIds = {};
  for (const image of [postgresImage, nodeImage]) imageIds[image] = (await docker(["image", "inspect", "--format", "{{.Id}}", image])).toString().trim();
  await mkdir(output, { mode: 0o700 }); // exclusive: an existing evidence directory is never reused
  const stage = await mkdtemp(join(tmpdir(), "p1-crm-fixture-code-"));
  const names = ["p1-crm-rehearsal-" + randomUUID(), "p1-crm-rehearsal-" + randomUUID()];
  const started = [];
  let completed = false;
  try {
    const checksums = {};
    const files = [...copiedScripts.map(name => "scripts/consolidation/" + name), "artifacts/api-server/package.json",
      ...(await readdir(join(root, "artifacts/api-server/migrations/dashboard"))).filter(name => name.endsWith(".sql")).sort().map(name => "artifacts/api-server/migrations/dashboard/" + name)];
    for (const file of files) {
      const target = join(stage, file);
      await mkdir(resolve(target, ".."), { recursive: true });
      await cp(join(root, file), target);
      checksums[file] = hash(await readFile(target));
    }
    // Nested read-only dependency mounts need existing targets within the
    // read-only staged source mount.
    await mkdir(join(stage, "node_modules"));
    await mkdir(join(stage, "artifacts/api-server/node_modules"));
    await writeFile(join(output, "provenance.json"), JSON.stringify({ schemaVersion: 1, type: "synthetic-fixture-only",
      fixtureApproval: "--approve-synthetic-fixture", generatedAt: new Date().toISOString(), imageIds,
      files: checksums, realOwnerMapping: false, productionData: false, sourceFreezeVerified: false, releaseApproval: false }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    async function start(name) {
      await docker(postgresArguments(name));
      started.push(name);
      for (let attempt = 0; attempt < 60; attempt++) {
        try { await docker(["exec", name, "pg_isready", "-U", "postgres", "-d", "crm_rehearsal"]); return; }
        catch { await new Promise(resolve => setTimeout(resolve, 500)); }
      }
      throw Error("Disposable database did not become ready");
    }
    await start(names[0]);
    await docker(workerArguments(names[0], stage, output, "import"));
    const dump = await docker(["exec", names[0], "pg_dump", "-U", "postgres", "-d", "crm_rehearsal", "--format=custom", "--no-owner", "--no-acl"]);
    await writeFile(join(output, "synthetic-dashboard.dump"), dump, { flag: "wx", mode: 0o600 });
    const dumpSha256 = hash(dump);
    await start(names[1]);
    // Transfer only the archive this invocation created; no path to a production dump is accepted.
    await docker(["cp", join(output, "synthetic-dashboard.dump"), `${names[1]}:/tmp/rehearsal.dump`]);
    await docker(["exec", names[1], "pg_restore", "-U", "postgres", "-d", "crm_rehearsal", "--exit-on-error", "--single-transaction", "--no-owner", "--no-acl", "/tmp/rehearsal.dump"]);
    await docker(workerArguments(names[1], stage, output, "restore"));
    const restored = JSON.parse(await readFile(join(output, "verification-restored.json"), "utf8"));
    if (!restored.verified || !restored.allTableRowsMatch) throw Error("Restored fixture verification failed");
    await writeFile(join(output, "result.json"), JSON.stringify({ schemaVersion: 1, scope: "synthetic_crm_import_replay_restore",
      verified: true, dumpSha256, fullSourceFixtureSha256: restored.inputFileSha256,
      counts: restored.counts, allTableRowsMatch: true, nativePostImportEditPreserved: true,
      sourceFreezeVerified: false, realOwnerMappingVerified: false, productionVerified: false, releaseApproval: false }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    completed = true;
    return { verified: true, scope: "synthetic_crm_import_replay_restore", output };
  } finally {
    const cleanup = [];
    for (const name of started.reverse()) {
      try { await docker(["rm", "-f", name]); cleanup.push({ name, removed: true }); }
      catch { cleanup.push({ name, removed: false }); }
    }
    await rm(stage, { recursive: true, force: true });
    await writeFile(join(output, "cleanup.json"), JSON.stringify({ completed, containers: cleanup }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    if (cleanup.some(item => !item.removed)) throw Error("Disposable container cleanup incomplete; inspect cleanup.json");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRehearsal(process.argv.slice(2)).then(result => process.stdout.write(JSON.stringify(result) + "\n")).catch(error => {
    process.stderr.write(error.message + "\n"); process.exitCode = 1;
  });
}
