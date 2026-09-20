import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdtemp, writeFile, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setupCrmImportFixture } from "./crm-import-fixture.mjs";
import { prepareCrmPayloads, digestCrmValue } from "./prepare-crm-payloads.mjs";
import { importCrmPayloads } from "./import-crm-payloads.mjs";
import { verifyCrmImport } from "./verify-crm-import.mjs";
const base = process.env.DASHBOARD_TEST_ORIGIN;
if (
  base &&
  (!base.startsWith("http://localhost:") ||
    !["127.0.0.1", "localhost"].includes(
      new URL(process.env.DASHBOARD_DATABASE_URL).hostname,
    ))
)
  throw Error("Disposable database required");
const require = createRequire(
    new URL("../../artifacts/api-server/package.json", import.meta.url),
  ),
  { Pool } = require("pg"),
  pool = new Pool({ connectionString: process.env.DASHBOARD_DATABASE_URL });
after(() => pool.end());
async function applied() {
  const state = await setupCrmImportFixture(pool);
  await importCrmPayloads(
    pool,
    state.input,
    {
      schemaVersion: 1,
      operation: "import_reviewed_crm",
      reviewedBy: state.owner,
      manifestSha256: prepareCrmPayloads(state.input).manifestSha256,
    },
    { dryRun: false },
  );
  return state;
}
const codes = (report) => report.issues.map((i) => i.code);
test(
  "Verification proves complete source/native origin, identifies missing imports and preserves later task edits",
  { skip: !base },
  async () => {
    const empty = await setupCrmImportFixture(pool);
    let report = await verifyCrmImport(pool, empty.input);
    assert.equal(report.verified, false);
    assert.equal(report.counts.archived, 0);
    assert.equal(
      report.issues.filter((i) => i.code === "missing_archive").length,
      6,
    );
    const s = await applied();
    report = await verifyCrmImport(pool, s.input);
    assert.equal(report.verified, true);
    assert.equal(report.counts.verified, 6);
    assert.equal(report.counts.nativeChecked, 4);
    assert.equal(report.counts.nativeRecords, 4);
    assert.equal(report.snapshot.read_only, "on");
    assert.equal(report.sourceFreezeVerified, false);
    assert.equal(report.releaseApproval, false);
    assert(!JSON.stringify(report).includes(s.input.records.leadNotes[0].body));
    const task = (
      await pool.query(
        "SELECT id FROM crm_task WHERE source_instance_id=$1 AND lead_id IS NOT NULL",
        [s.instance],
      )
    ).rows[0];
    await pool.query(
      "UPDATE crm_task SET title='Later work',completed=true,assigned_to_id=NULL,changed_by_id=$2,version=version+1,updated_at=now() WHERE id=$1",
      [task.id, s.owner],
    );
    report = await verifyCrmImport(pool, s.input);
    assert.equal(report.verified, true);
    assert.equal(report.counts.nativeTasksChanged, 1);
    assert.equal(
      (await pool.query("SELECT title FROM crm_task WHERE id=$1", [task.id]))
        .rows[0].title,
      "Later work",
    );
    await pool.query(
      "DELETE FROM commercial_intake_receipt WHERE source_instance_id=$1",
      [s.instance],
    );
    report = await verifyCrmImport(pool, s.input);
    assert.equal(report.verified, false);
    assert(codes(report).includes("receipt_mapping_mismatch"));
    const changed = structuredClone(s.input);
    changed.records.leadNotes[0].body += " changed source";
    report = await verifyCrmImport(pool, changed);
    assert.equal(report.verified, false);
    assert(codes(report).includes("source_content_mismatch"));
    assert(codes(report).includes("projection_hash_mismatch"));
    assert(codes(report).includes("native_note_mismatch"));
    const subset = structuredClone(s.input);
    subset.records.clientNotes = [];
    report = await verifyCrmImport(pool, subset);
    assert.equal(report.verified, false);
    assert(codes(report).includes("unexpected_archive"));
    assert(codes(report).includes("unexpected_import_audit"));
  },
);
test(
  "Verification detects incomplete audit/history and unarchived provenance without weakening immutability controls",
  { skip: !base },
  async () => {
    const s = await applied();
    await pool.query(
      "DELETE FROM audit_event WHERE action='crm.source_imported' AND details->>'sourceInstanceId'=$1 AND details->>'sourceTable'='leadNotes'",
      [s.instance],
    );
    let report = await verifyCrmImport(pool, s.input);
    assert(codes(report).includes("audit_mismatch"));
    await pool.query(
      "INSERT INTO lead_note(id,lead_id,body,source_instance_id,source_note_id) VALUES($1,$2,'Unarchived synthetic record',$3,'unarchived')",
      [randomUUID(), s.lead, s.instance],
    );
    report = await verifyCrmImport(pool, s.input);
    assert(codes(report).includes("unexpected_native_record"));
    const task = (
      await pool.query(
        "SELECT id FROM crm_task WHERE source_instance_id=$1 AND lead_id IS NOT NULL",
        [s.instance],
      )
    ).rows[0];
    await pool.query(
      "INSERT INTO crm_task_revision(task_id,version,title,completed) VALUES($1,99,'Synthetic incomplete restoration',true)",
      [task.id],
    );
    report = await verifyCrmImport(pool, s.input);
    assert(codes(report).includes("native_task_history_gap"));
    assert.equal(report.verified, false);
  },
);
test(
  "Verification recomputes archive content independently of stored hashes and metadata",
  { skip: !base },
  async () => {
    const s = await setupCrmImportFixture(pool),
      manifest = prepareCrmPayloads(s.input),
      parent = manifest.records.find((r) => r.collection === "leads");
    await pool.query(
      "INSERT INTO crm_source_record(source_instance_id,source_table,source_id,source_sha256,source_payload,lead_id,projection_sha256,review_sha256,imported_by_id) VALUES($1,'leads',$2,$3,$4,$5,$6,$7,$8)",
      [
        s.instance,
        parent.sourceId,
        parent.sourceDigest,
        JSON.stringify({
          ...parent.sourceSnapshot,
          name: "Corrupted restore payload",
        }),
        s.lead,
        digestCrmValue({ entity: "lead", targetId: s.lead, projection: null }),
        manifest.manifestSha256,
        s.owner,
      ],
    );
    const report = await verifyCrmImport(pool, s.input);
    assert.equal(report.verified, false);
    assert(codes(report).includes("source_content_mismatch"));
    assert(codes(report).includes("audit_mismatch"));
  },
);
test(
  "CLI writes private exclusive evidence and exits distinctly for mismatches and verified data",
  { skip: !base },
  async () => {
    const s = await setupCrmImportFixture(pool),
      dir = await mkdtemp(join(tmpdir(), "crm-verify-")),
      run = promisify(execFile);
    try {
      const input = join(dir, "source.json"),
        output = join(dir, "partial.json"),
        script = fileURLToPath(
          new URL("./verify-crm-import.mjs", import.meta.url),
        );
      await writeFile(input, JSON.stringify(s.input), { mode: 0o600 });
      await assert.rejects(
        run(process.execPath, [script, "--input", input, "--output", output]),
        (error) =>
          error.code === 2 &&
          JSON.parse(error.stdout).verified === false &&
          error.stderr === "",
      );
      assert.equal((await stat(output)).mode & 0o777, 0o600);
      const original = await readFile(output, "utf8");
      assert.equal(JSON.parse(original).releaseApproval, false);
      await assert.rejects(
        run(process.execPath, [script, "--input", input, "--output", output]),
        (error) => error.code === 1,
      );
      assert.equal(await readFile(output, "utf8"), original);
      await importCrmPayloads(
        pool,
        s.input,
        {
          schemaVersion: 1,
          operation: "import_reviewed_crm",
          reviewedBy: s.owner,
          manifestSha256: prepareCrmPayloads(s.input).manifestSha256,
        },
        { dryRun: false },
      );
      const result = await run(process.execPath, [
        script,
        "--input",
        input,
        "--output",
        join(dir, "verified.json"),
      ]);
      assert.equal(JSON.parse(result.stdout).verified, true);
      assert(!result.stdout.includes("Private"));
      assert.equal(result.stderr, "");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
);

test(
  "Verification reads one consistent snapshot while native work changes concurrently",
  { skip: !base },
  async () => {
    const s = await applied();
    let edited = false;
    const wrapped = {
      connect: async () => {
        const c = await pool.connect();
        return {
          release: (...args) => c.release(...args),
          query: async (sql, params) => {
            const result = await c.query(sql, params);
            if (!edited && sql.startsWith("SELECT source_table,source_id,")) {
              edited = true;
              await pool.query(
                "UPDATE crm_task SET title='Concurrent work',version=version+1,changed_by_id=$2 WHERE source_instance_id=$1 AND lead_id IS NOT NULL",
                [s.instance, s.owner],
              );
            }
            return result;
          },
        };
      },
    };
    const report = await verifyCrmImport(wrapped, s.input);
    assert(edited);
    assert.equal(report.verified, true);
    assert.equal(report.counts.nativeTasksChanged, 0);
    const next = await verifyCrmImport(pool, s.input);
    assert.equal(next.verified, true);
    assert.equal(next.counts.nativeTasksChanged, 1);
  },
);

test(
  "Additive verification independently checks created values, immutable origin/archive, existing target and receipt identity",
  { skip: !base },
  async () => {
    const state = await setupCrmImportFixture(pool),
      { input, owner, lead, instance } = state;
    const matchedBefore = (
      await pool.query("SELECT to_jsonb(lead) row FROM lead WHERE id=$1", [
        lead,
      ])
    ).rows[0].row;
    const receiptBefore = (
      await pool.query(
        "SELECT to_jsonb(r) row FROM commercial_intake_receipt r WHERE source_instance_id=$1",
        [instance],
      )
    ).rows[0].row;
    const source = {
      ...input.records.leads[0],
      id: "additive-verification",
      formSubmissionId: randomUUID(),
      stage: "contacted",
      formData: { address: "Submitted site", services: ["Mowing"] },
    };
    input.records.leads.push(source);
    const mappings = [
      {
        action: "create_separate_inquiry",
        sourceId: source.id,
        targetId: randomUUID(),
      },
    ];
    const { prepareCrmImportPlan } = await import("./import-crm-payloads.mjs");
    const review = {
      schemaVersion: 2,
      operation: "import_reviewed_crm",
      reviewedBy: owner,
      sourceFreezeVerified: true,
      inquiryMappings: mappings,
      manifestSha256: prepareCrmImportPlan(input, mappings).manifestSha256,
    };
    await importCrmPayloads(pool, input, review, { dryRun: false });
    assert.deepEqual(
      (
        await pool.query("SELECT to_jsonb(lead) row FROM lead WHERE id=$1", [
          lead,
        ])
      ).rows[0].row,
      matchedBefore,
    );
    assert.deepEqual(
      (
        await pool.query(
          "SELECT to_jsonb(r) row FROM commercial_intake_receipt r WHERE source_instance_id=$1",
          [instance],
        )
      ).rows[0].row,
      receiptBefore,
    );
    let report = await verifyCrmImport(pool, input, review);
    assert.equal(report.verified, true, JSON.stringify(report.issues));
    assert.equal(report.byCollection.leads.verified, 2);
    const directory = await mkdtemp(join(tmpdir(), "p1-crm-additive-verify-"));
    try {
      const sourcePath = join(directory, "source.json"),
        reviewPath = join(directory, "review.json"),
        outputPath = join(directory, "result.json");
      await writeFile(sourcePath, JSON.stringify(input), { mode: 0o600 });
      await writeFile(reviewPath, JSON.stringify(review), { mode: 0o600 });
      const { main: verifyCli } = await import("./verify-crm-import.mjs");
      const result = await verifyCli([
        "--input",
        sourcePath,
        "--output",
        outputPath,
        "--review",
        reviewPath,
      ]);
      assert.equal(result.verified, true);
      assert.equal((await stat(outputPath)).mode & 0o777, 0o600);
      assert.equal(
        JSON.parse(await readFile(outputPath, "utf8")).manifestSha256,
        review.manifestSha256,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }

    await pool.query("UPDATE lead SET status='qualified' WHERE id=$1", [
      mappings[0].targetId,
    ]);
    report = await verifyCrmImport(pool, input, review);
    assert(codes(report).includes("native_inquiry_current_values_differ"));
    assert(!codes(report).includes("native_inquiry_origin_mismatch"));
    // Restore current value; then a receipt remapping must independently fail verification.
    await pool.query("UPDATE lead SET status='contacted' WHERE id=$1", [
      mappings[0].targetId,
    ]);
    await pool.query(
      "UPDATE commercial_intake_receipt SET submission_id=$2 WHERE source_instance_id=$1",
      [instance, randomUUID()],
    );
    report = await verifyCrmImport(pool, input, review);
    assert(codes(report).includes("receipt_mapping_mismatch"));
    await assert.rejects(
      verifyCrmImport(pool, input, {
        ...review,
        manifestSha256: "0".repeat(64),
      }),
      /review_mismatch/,
    );
  },
);
