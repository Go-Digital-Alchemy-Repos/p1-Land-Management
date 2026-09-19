import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { setupCrmImportFixture } from "./crm-import-fixture.mjs";
import { prepareCrmPayloads, parseCrmJson } from "./prepare-crm-payloads.mjs";
import { importCrmPayloads } from "./import-crm-payloads.mjs";
import { verifyCrmImport } from "./verify-crm-import.mjs";

const hash = value => createHash("sha256").update(value).digest("hex");
const ident = value => '"' + value.replaceAll('"', '""') + '"';
const evidence = "/evidence";
const write = (name, value) => writeFile(`${evidence}/${name}.json`, JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });

// No caller-supplied connection strings. This worker is launched only inside a
// disposable network-none PostgreSQL container's network namespace.
export function assertWorkerEnvironment(mode, env = process.env) {
  if (!["import", "restore"].includes(mode) || env.P1_SYNTHETIC_CRM_REHEARSAL !== "approved-fixture-only" ||
      env.DATABASE_URL || env.DASHBOARD_DATABASE_URL || env.PGHOST || env.PGSERVICE || env.PGSERVICEFILE || env.PGOPTIONS) {
    throw Error("Synthetic rehearsal worker configuration rejected");
  }
}

async function fingerprint(pool) {
  const tables = (await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  const result = {};
  for (const { tablename } of tables) {
    const rows = (await pool.query(`SELECT row_to_json(t)::text value FROM public.${ident(tablename)} t ORDER BY row_to_json(t)::text`)).rows;
    result[tablename] = { count: rows.length, sha256: hash(JSON.stringify(rows.map(row => row.value))) };
  }
  return result;
}

export async function runWorker(mode) {
  assertWorkerEnvironment(mode);
  const require = createRequire(new URL("../../artifacts/api-server/package.json", import.meta.url));
  const { Pool } = require("pg");
  const pool = new Pool({ host: "127.0.0.1", port: 5432, user: "postgres", database: "crm_rehearsal", max: 1,
    connectionTimeoutMillis: 10000, statement_timeout: 60000, options: "-c timezone=UTC" });
  try {
    if (mode === "import") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(918277)");
        await client.query("CREATE TABLE dashboard_migration (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
        const directory = new URL("../../artifacts/api-server/migrations/dashboard/", import.meta.url);
        for (const name of (await readdir(directory)).filter(name => name.endsWith(".sql")).sort()) {
          const sql = await readFile(new URL(name, directory), "utf8");
          await client.query(sql);
          await client.query("INSERT INTO dashboard_migration(name,checksum) VALUES($1,$2)", [name, hash(sql)]);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }

      const fixture = await setupCrmImportFixture(pool);
      const raw = JSON.stringify(fixture.input, null, 2) + "\n";
      await writeFile(`${evidence}/full-source-fixture.json`, raw, { flag: "wx", mode: 0o600 });
      const input = parseCrmJson(Buffer.from(raw));
      const review = { schemaVersion: 1, operation: "import_reviewed_crm", reviewedBy: fixture.owner,
        manifestSha256: prepareCrmPayloads(input).manifestSha256 };
      await write("synthetic-review", { provenance: "Generated fixture Owner; not a real Owner decision", approval: "fixture-only", review });
      const dryRun = await importCrmPayloads(pool, input, review);
      assert.equal(dryRun.created, 0);
      const imported = await importCrmPayloads(pool, input, review, { dryRun: false });
      assert.equal(imported.created, prepareCrmPayloads(input).records.length);
      const initial = await verifyCrmImport(pool, input);
      assert.equal(initial.verified, true, "Independent initial verification failed");
      await write("verification-initial", { ...initial, inputFileSha256: hash(raw) });

      const changed = await pool.query("UPDATE crm_task SET title='Synthetic native post-import edit',completed=true,version=version+1,changed_by_id=$2 WHERE source_instance_id=$1 AND lead_id=$3 RETURNING id,version,title,completed", [fixture.instance, fixture.owner, fixture.lead]);
      assert.equal(changed.rowCount, 1);
      assert.equal(changed.rows[0].version, 2);
      const replay = await importCrmPayloads(pool, input, review, { dryRun: false });
      assert.equal(replay.created, 0);
      assert.equal(replay.replayed, imported.created);
      const afterEdit = await pool.query("SELECT id,version,title,completed FROM crm_task WHERE id=$1", [changed.rows[0].id]);
      assert.deepEqual(afterEdit.rows, changed.rows);
      const verified = await verifyCrmImport(pool, input);
      assert.equal(verified.verified, true, "Independent post-replay verification failed");
      assert.equal(verified.counts.nativeTasksChanged, 1);
      await write("verification-replayed", { ...verified, inputFileSha256: hash(raw) });
      await write("fingerprint-before-dump", await fingerprint(pool));
      await write("import-result", { dryRun, imported, replay, nativeEditPreserved: true, sourceFreezeVerified: false, releaseApproval: false });
    } else {
      const raw = await readFile(`${evidence}/full-source-fixture.json`);
      const initial = JSON.parse(await readFile(`${evidence}/verification-initial.json`, "utf8"));
      assert.equal(hash(raw), initial.inputFileSha256, "Original complete fixture export changed");
      const verified = await verifyCrmImport(pool, parseCrmJson(raw));
      assert.equal(verified.verified, true, "Independent restored verification failed");
      assert.equal(verified.counts.nativeTasksChanged, 1);
      const restored = await fingerprint(pool);
      assert.deepEqual(restored, JSON.parse(await readFile(`${evidence}/fingerprint-before-dump.json`, "utf8")), "Restored rows differ from pre-dump rows");
      await write("fingerprint-restored", restored);
      await write("verification-restored", { ...verified, inputFileSha256: hash(raw), allTableRowsMatch: true });
    }
  } finally { await pool.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runWorker(process.argv[2]).catch(() => {
    // SQL/provider messages can contain row values; preserve a fixed safe error.
    process.stderr.write("Synthetic CRM rehearsal worker failed; no acceptance claimed.\n");
    process.exitCode = 1;
  });
}
