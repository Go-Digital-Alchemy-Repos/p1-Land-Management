import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { setupCrmImportFixture } from "./crm-import-fixture.mjs";
import { at } from "./crm-payload-fixture.mjs";
import { prepareCrmPayloads } from "./prepare-crm-payloads.mjs";
import {
  importCrmPayloads,
  prepareCrmImportPlan,
} from "./import-crm-payloads.mjs";
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
);
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DASHBOARD_DATABASE_URL });
after(() => pool.end());
const review = (input, owner) => ({
  schemaVersion: 1,
  operation: "import_reviewed_crm",
  manifestSha256: prepareCrmPayloads(input).manifestSha256,
  reviewedBy: owner,
});
const setup = () => setupCrmImportFixture(pool);

const count = async (instance) =>
  (
    await pool.query(
      "SELECT count(*)::int n FROM crm_source_record WHERE source_instance_id=$1",
      [instance],
    )
  ).rows[0].n;
test(
  "Reviewed CRM import is atomic, preserves payloads and replays without overwriting later native edits",
  { skip: !base },
  async () => {
    const { owner, person, lead, client, instance, input } = await setup();
    const approved = review(input, owner);
    assert.deepEqual(await importCrmPayloads(pool, input, approved), {
      mode: "dry-run",
      records: 6,
      replayed: 0,
      created: 0,
      wouldCreate: 6,
    });
    assert.equal(await count(instance), 0);
    assert.equal(
      (
        await pool.query(
          "SELECT id FROM lead_note WHERE source_instance_id=$1",
          [instance],
        )
      ).rowCount,
      0,
    );
    const results = await Promise.all([
      importCrmPayloads(pool, input, approved, { dryRun: false }),
      importCrmPayloads(pool, input, approved, { dryRun: false }),
    ]);
    assert.deepEqual(results.map((r) => r.created).sort(), [0, 6]);
    assert.deepEqual(results.map((r) => r.replayed).sort(), [0, 6]);
    assert.equal(await count(instance), 6);
    const archive = (
      await pool.query(
        "SELECT * FROM crm_source_record WHERE source_instance_id=$1",
        [instance],
      )
    ).rows;
    for (const row of archive) {
      assert.deepEqual(row.source_payload, input.records[row.source_table][0]);
      assert.equal(row.imported_by_id, owner);
      assert.equal(row.review_sha256, approved.manifestSha256);
    }
    const note = (
      await pool.query(
        `SELECT body,author_id,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') created FROM lead_note WHERE source_instance_id=$1`,
        [instance],
      )
    ).rows[0];
    assert.equal(note.body, input.records.leadNotes[0].body);
    assert.equal(note.author_id, person);
    assert.equal(note.created, at);
    const task = (
      await pool.query(
        "SELECT * FROM crm_task WHERE source_instance_id=$1 AND lead_id=$2",
        [instance, lead],
      )
    ).rows[0];
    assert.equal(task.assigned_to_id, person);
    assert.equal(task.created_by_id, null);
    assert.equal(task.changed_by_id, null);
    assert.equal(task.source_created_by_id, null);
    const completed = (
      await pool.query(
        "SELECT * FROM crm_task WHERE source_instance_id=$1 AND client_id=$2",
        [instance, client],
      )
    ).rows[0];
    assert.equal(completed.completed, true);
    assert.equal(completed.assigned_to_id, null);
    assert.equal(completed.source_assigned_to_id, "missing-user");
    const existing = (
      await pool.query(
        "SELECT name,email,description,status,version FROM lead WHERE id=$1",
        [lead],
      )
    ).rows[0];
    assert.deepEqual(existing, {
      name: "Existing lead",
      email: "existing@example.test",
      description: "Existing intake",
      status: "new",
      version: 1,
    });
    assert.deepEqual(
      (
        await pool.query(
          "SELECT raw_intake FROM commercial_intake_receipt WHERE source_instance_id=$1",
          [instance],
        )
      ).rows[0].raw_intake,
      { original: true },
    );
    const preciseTask = (
      await pool.query(
        `SELECT to_char(due_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') due, to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') created, to_char(updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') updated FROM crm_task WHERE id=$1`,
        [task.id],
      )
    ).rows[0];
    assert.deepEqual(preciseTask, { due: at, created: at, updated: at });
    const token = randomUUID();
    await pool.query(
      'INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
      [randomUUID(), token, person],
    );
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET)
      .update(token)
      .digest("base64");
    const headers = {
      cookie:
        "p1-dashboard.session_token=" +
        encodeURIComponent(token + "." + signature),
    };
    const notesResponse = await fetch(`${base}/api/v1/leads/${lead}/notes`, {
      headers,
    });
    assert.equal(notesResponse.status, 200);
    assert.equal(
      notesResponse.headers.get("cache-control"),
      "private, no-store",
    );
    const notePage = await notesResponse.json();
    assert(
      notePage.items.some(
        (row) => row.imported && row.body === input.records.leadNotes[0].body,
      ),
    );
    const clientNotes = await fetch(`${base}/api/v1/clients/${client}/notes`, {
      headers,
    });
    assert.equal(clientNotes.status, 200);
    assert((await clientNotes.json()).items.some((row) => row.imported));
    await pool.query(
      "UPDATE business_account_access SET capabilities=ARRAY['revenue.sales'] WHERE user_id=$1",
      [person],
    );
    assert.equal(
      (await fetch(`${base}/api/v1/clients/${client}/notes`, { headers }))
        .status,
      403,
    );
    assert.equal(
      (await fetch(`${base}/api/v1/leads/${lead}/notes`, { headers })).status,
      200,
    );
    await pool.query(
      "UPDATE crm_task SET title='Native edit',completed=true,version=version+1,changed_by_id=$2 WHERE id=$1",
      [task.id, owner],
    );
    await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1", [
      person,
    ]);
    const replay = await importCrmPayloads(pool, input, approved, {
      dryRun: false,
    });
    assert.equal(replay.replayed, 6);
    assert.equal(
      (await pool.query("SELECT title FROM crm_task WHERE id=$1", [task.id]))
        .rows[0].title,
      "Native edit",
    );
    assert.equal(
      (
        await pool.query("SELECT * FROM crm_task_revision WHERE task_id=$1", [
          task.id,
        ])
      ).rowCount,
      2,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT id FROM audit_event WHERE details->>'sourceInstanceId'=$1 AND action='crm.source_imported'",
          [instance],
        )
      ).rowCount,
      6,
    );
    await assert.rejects(
      pool.query(
        "UPDATE crm_source_record SET source_payload='{}' WHERE source_instance_id=$1",
        [instance],
      ),
      /immutable/,
    );
    await assert.rejects(
      pool.query("DELETE FROM crm_source_record WHERE source_instance_id=$1", [
        instance,
      ]),
      /immutable/,
    );
    const changed = structuredClone(input);
    changed.records.leadNotes[0].body = "Different source";
    await assert.rejects(
      importCrmPayloads(pool, changed, review(changed, owner), {
        dryRun: false,
      }),
      /source_conflict/,
    );
    assert.equal(await count(instance), 6);
    await assert.rejects(
      importCrmPayloads(
        pool,
        input,
        { ...approved, manifestSha256: "0".repeat(64) },
        { dryRun: false },
      ),
      /review_mismatch/,
    );
    await assert.rejects(
      importCrmPayloads(
        pool,
        input,
        { ...approved, reviewedBy: person },
        { dryRun: false },
      ),
      /owner_required/,
    );
  },
);
test(
  "Fresh mapping, owner and open-task eligibility changes abort imports; completed historical assignments remain attributable",
  { skip: !base },
  async () => {
    const a = await setup();
    await pool.query("UPDATE lead SET converted_client_id=NULL WHERE id=$1", [
      a.lead,
    ]);
    await assert.rejects(
      importCrmPayloads(pool, a.input, review(a.input, a.owner), {
        dryRun: false,
      }),
      /conversion_changed/,
    );
    assert.equal(await count(a.instance), 0);
    const b = await setup();
    await pool.query(
      "DELETE FROM commercial_intake_receipt WHERE source_instance_id=$1",
      [b.instance],
    );
    await assert.rejects(
      importCrmPayloads(pool, b.input, review(b.input, b.owner), {
        dryRun: false,
      }),
      /receipt_changed/,
    );
    assert.equal(await count(b.instance), 0);
    const c = await setup();
    await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1", [
      c.person,
    ]);
    await assert.rejects(
      importCrmPayloads(pool, c.input, review(c.input, c.owner), {
        dryRun: false,
      }),
      /assignee_ineligible/,
    );
    assert.equal(await count(c.instance), 0);
    assert.equal(
      (
        await pool.query(
          "SELECT id FROM client_note WHERE source_instance_id=$1",
          [c.instance],
        )
      ).rowCount,
      0,
    );
    c.input.records.leadTasks[0].completed = true;
    assert.equal(
      (
        await importCrmPayloads(pool, c.input, review(c.input, c.owner), {
          dryRun: false,
        })
      ).created,
      6,
    );
    const d = await setup();
    await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1", [
      d.owner,
    ]);
    await assert.rejects(
      importCrmPayloads(pool, d.input, review(d.input, d.owner)),
      /owner_required/,
    );
  },
);
test(
  "Audit failure rolls back archives, notes, tasks and revisions; preexisting provenance cannot be silently adopted",
  { skip: !base },
  async () => {
    const a = await setup();
    const functionName = "reject_crm_" + a.instance.replaceAll("-", "");
    await pool.query(
      `CREATE FUNCTION ${functionName}() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Synthetic CRM audit failure'; END; $$ LANGUAGE plpgsql`,
    );
    await pool.query(
      `CREATE TRIGGER ${functionName} BEFORE INSERT ON audit_event FOR EACH ROW WHEN (NEW.action='crm.source_imported' AND NEW.details->>'sourceTable'='leadTasks' AND NEW.details->>'sourceInstanceId'='${a.instance}') EXECUTE FUNCTION ${functionName}()`,
    );
    try {
      await assert.rejects(
        importCrmPayloads(pool, a.input, review(a.input, a.owner), {
          dryRun: false,
        }),
        /Synthetic CRM audit failure/,
      );
      assert.equal(await count(a.instance), 0);
      assert.equal(
        (
          await pool.query(
            "SELECT id FROM client_note WHERE source_instance_id=$1",
            [a.instance],
          )
        ).rowCount,
        0,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT id FROM crm_task WHERE source_instance_id=$1",
            [a.instance],
          )
        ).rowCount,
        0,
      );
    } finally {
      await pool.query(`DROP TRIGGER ${functionName} ON audit_event`);
      await pool.query(`DROP FUNCTION ${functionName}()`);
    }
    await pool.query(
      "INSERT INTO lead_note(id,lead_id,body,source_instance_id,source_note_id) VALUES($1,$2,'Unreviewed prior import',$3,'note')",
      [randomUUID(), a.lead, a.instance],
    );
    await assert.rejects(
      importCrmPayloads(pool, a.input, review(a.input, a.owner), {
        dryRun: false,
      }),
      /duplicate key/,
    );
    assert.equal(await count(a.instance), 0);
  },
);

test(
  "CLI requires explicit mode and manifest-bound review, emits counts only and supports dry-run then replay",
  { skip: !base },
  async () => {
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);
    const { owner, instance, input } = await setup();
    const dir = await mkdtemp(join(tmpdir(), "crm-import-fixture-"));
    try {
      const exportPath = join(dir, "export.json"),
        reviewPath = join(dir, "review.json");
      await writeFile(exportPath, JSON.stringify(input), { mode: 0o600 });
      await writeFile(reviewPath, JSON.stringify(review(input, owner)), {
        mode: 0o600,
      });
      const script = fileURLToPath(
        new URL("./import-crm-payloads.mjs", import.meta.url),
      );
      const args = [
        script,
        "--input",
        exportPath,
        "--review",
        reviewPath,
        "--mode",
      ];
      const dry = await run(process.execPath, [...args, "dry-run"]);
      assert.equal(JSON.parse(dry.stdout).wouldCreate, 6);
      assert.equal(dry.stderr, "");
      assert.equal(await count(instance), 0);
      const applied = await run(process.execPath, [...args, "apply"]);
      assert.equal(JSON.parse(applied.stdout).created, 6);
      assert.equal(applied.stderr, "");
      const replay = await run(process.execPath, [...args, "apply"]);
      assert.equal(JSON.parse(replay.stdout).replayed, 6);
      assert.equal(await count(instance), 6);
      assert(!applied.stdout.includes("Private"));
      assert(!applied.stdout.includes(instance));
      await assert.rejects(
        run(process.execPath, args.slice(0, -1)),
        (error) => error.code === 1 && !error.stderr.includes("Private"),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
);

test(
  "Source parent identity cannot collapse onto an earlier imported mapping from another batch",
  { skip: !base },
  async () => {
    const { owner, instance, input } = await setup();
    await importCrmPayloads(pool, input, review(input, owner), {
      dryRun: false,
    });
    const changed = structuredClone(input);
    changed.records.leads[0].id = "different-source-lead";
    changed.records.clients = [];
    changed.records.leadNotes = [];
    changed.records.clientNotes = [];
    changed.records.leadTasks = [];
    changed.records.clientTasks = [];
    await assert.rejects(
      importCrmPayloads(pool, changed, review(changed, owner), {
        dryRun: false,
      }),
      /duplicate key/,
    );
    assert.equal(await count(instance), 6);
  },
);

test(
  "Noncanonical target UUIDs fail before import rather than creating an unreplayable mapping",
  { skip: !base },
  async () => {
    const s = await setup(),
      input = structuredClone(s.input),
      upper = "ABCDEFAB-0000-4000-8000-000000000001";
    input.targetInventory.dashboardLeads[0].id = upper;
    input.targetInventory.receipts[0].leadId = upper;
    await assert.rejects(
      importCrmPayloads(pool, input, review(input, s.owner), { dryRun: false }),
      /invalid_target/,
    );
    assert.equal(await count(s.instance), 0);
  },
);

function additiveInput(input) {
  const source = {
    ...input.records.leads[0],
    id: "unmatched-a",
    formSubmissionId: randomUUID(),
    name: "Contact A",
    stage: "new",
    ownerId: "historical-owner",
    formData: {
      address: "Shared submitted site",
      propertyName: "Submitted property",
      services: ["Mowing"],
      attribution: { source: "historical" },
      acreage: "10",
      unknown: { retained: true },
    },
  };
  input.records.leads.push(source, {
    ...source,
    id: "unmatched-b",
    formSubmissionId: randomUUID(),
    name: "Contact B",
    stage: "contacted",
    message: "Separate inquiry",
  });
  return [source.id, "unmatched-b"].map((sourceId) => ({
    action: "create_separate_inquiry",
    sourceId,
    targetId: randomUUID(),
  }));
}
const additiveReview = (input, owner, inquiryMappings) => ({
  schemaVersion: 2,
  operation: "import_reviewed_crm",
  manifestSha256: prepareCrmImportPlan(input, inquiryMappings).manifestSha256,
  reviewedBy: owner,
  sourceFreezeVerified: true,
  inquiryMappings,
});

test("Additive review binds separate source identities, targets and derived fields without changing the source manifest", async () => {
  const { fixture } = await import("./crm-payload-fixture.mjs");
  const input = fixture(),
    before = prepareCrmPayloads(input).manifestSha256;
  const mappings = additiveInput(input);
  const sourceHash = prepareCrmPayloads(input).manifestSha256;
  const plan = prepareCrmImportPlan(input, mappings);
  assert.equal(plan.sourceManifestSha256, sourceHash);
  assert.equal(prepareCrmPayloads(input).manifestSha256, sourceHash);
  assert.notEqual(before, sourceHash);
  assert.equal(
    plan.manifestSha256,
    prepareCrmImportPlan(input, [...mappings].reverse()).manifestSha256,
  );
  assert.notEqual(
    plan.manifestSha256,
    prepareCrmImportPlan(
      input,
      mappings.map((m, i) => (i ? m : { ...m, targetId: randomUUID() })),
    ).manifestSha256,
  );
  const projected = plan.records.filter(
    (r) => r.action === "create_separate_inquiry",
  );
  assert.equal(projected.length, 2);
  assert.equal(projected[0].nativeProjection.name, "Contact A");
  assert.equal(
    projected[0].nativeProjection.reportedPropertyName,
    "Submitted property",
  );
  assert.equal(projected[0].nativeProjection.ownerId, null);
  assert.equal(projected[0].nativeProjection.nextAction, null);
  assert.equal(projected[0].nativeProjection.nextActionDueAt, at);
  assert.throws(
    () =>
      prepareCrmImportPlan(input, [
        { ...mappings[0], sourceId: "source-lead" },
      ]),
    /not_unmatched/,
  );
  assert.throws(
    () =>
      prepareCrmImportPlan(input, [
        mappings[0],
        { ...mappings[1], targetId: mappings[0].targetId },
      ]),
    /invalid_inquiry_mapping/,
  );
  input.records.leads[1].stage = "custom-stage";
  assert.throws(
    () => prepareCrmImportPlan(input, mappings),
    /lifecycle_requires_review/,
  );
});

test(
  "Additive inquiry import preserves identities/dates, dry-runs and concurrently replays without merging or overwriting",
  { skip: !base },
  async () => {
    const { owner, lead, instance, input } = await setup();
    const mappings = additiveInput(input),
      approved = additiveReview(input, owner, mappings);
    await assert.rejects(
      importCrmPayloads(pool, input, {
        ...approved,
        sourceFreezeVerified: false,
      }),
      /review_mismatch/,
    );
    await assert.rejects(
      importCrmPayloads(pool, input, {
        ...approved,
        inquiryMappings: mappings.map((m, i) =>
          i ? m : { ...m, targetId: randomUUID() },
        ),
      }),
      /review_mismatch/,
    );
    const dry = await importCrmPayloads(pool, input, approved);
    assert.equal(dry.wouldCreate, 8);
    assert.equal(
      (
        await pool.query("SELECT id FROM lead WHERE id=ANY($1::uuid[])", [
          mappings.map((m) => m.targetId),
        ])
      ).rowCount,
      0,
    );
    const results = await Promise.all(
      [1, 2].map(() =>
        importCrmPayloads(pool, input, approved, { dryRun: false }),
      ),
    );
    assert.deepEqual(results.map((r) => r.created).sort(), [0, 8]);
    const rows = (
      await pool.query(
        `SELECT *,to_char(next_action_due_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') due,
    to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') created,
    to_char(last_activity_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') activity
    FROM lead WHERE id=ANY($1::uuid[]) ORDER BY name`,
        [mappings.map((m) => m.targetId)],
      )
    ).rows;
    assert.deepEqual(
      rows.map((r) => r.name),
      ["Contact A", "Contact B"],
    );
    assert.deepEqual(
      rows.map((r) => r.status),
      ["new", "contacted"],
    );
    for (const row of rows) {
      assert.equal(row.location, "Shared submitted site");
      assert.equal(row.owner_id, null);
      assert.equal(row.next_action, null);
      assert.equal(row.due, at);
      assert.equal(row.created, at);
      assert.equal(row.activity, at);
      assert.equal(row.converted_client_id, null);
      assert.equal(row.converted_property_id, null);
      assert.equal(row.inquiry_type, null);
      assert.deepEqual(row.services, ["Mowing"]);
    }
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int n FROM commercial_intake_receipt WHERE source_instance_id=$1",
          [instance],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (await pool.query("SELECT name FROM lead WHERE id=$1", [lead])).rows[0]
        .name,
      "Existing lead",
    );
    const archived = (
      await pool.query(
        "SELECT source_payload,review_sha256 FROM crm_source_record WHERE source_instance_id=$1 AND source_id='unmatched-a'",
        [instance],
      )
    ).rows[0];
    assert.deepEqual(archived.source_payload, input.records.leads[1]);
    assert.equal(archived.review_sha256, approved.manifestSha256);
    await pool.query(
      "UPDATE lead SET name='Later staff edit',version=version+1 WHERE id=$1",
      [mappings[0].targetId],
    );
    assert.equal(
      (await importCrmPayloads(pool, input, approved, { dryRun: false }))
        .replayed,
      8,
    );
    assert.equal(
      (
        await pool.query("SELECT name FROM lead WHERE id=$1", [
          mappings[0].targetId,
        ])
      ).rows[0].name,
      "Later staff edit",
    );
    const changed = mappings.map((m, i) =>
      i ? m : { ...m, targetId: randomUUID() },
    );
    await assert.rejects(
      importCrmPayloads(pool, input, additiveReview(input, owner, changed), {
        dryRun: false,
      }),
      /source_conflict/,
    );
  },
);

test(
  "Additive creation rolls back the entire batch on occupied target, changed receipt or late archive audit failure",
  { skip: !base },
  async () => {
    for (const failure of ["target", "receipt", "audit"]) {
      const { owner, instance, input, lead } = await setup();
      const mappings = additiveInput(input),
        approved = additiveReview(input, owner, mappings);
      if (failure === "target")
        await pool.query(
          "INSERT INTO lead(id,name,location,description) VALUES($1,'Existing unrelated','','')",
          [mappings[1].targetId],
        );
      if (failure === "receipt")
        await pool.query(
          `INSERT INTO commercial_intake_receipt(id,source_instance_id,submission_id,event_id,schema_version,payload_sha256,accepted_at,lead_id,raw_intake)
      VALUES($1,$2,$3,$4,1,$5,now(),$6,'{}')`,
          [
            randomUUID(),
            instance,
            input.records.leads[2].formSubmissionId,
            randomUUID(),
            "a".repeat(64),
            // A fresh target for the late handoff; it must not be duplicated by import.
            (
              await pool.query(
                "INSERT INTO lead(id,name,location,description) VALUES($1,'Late intake','','') RETURNING id",
                [randomUUID()],
              )
            ).rows[0].id,
          ],
        );
      const trigger = "reject_crm_" + randomUUID().replaceAll("-", "");
      if (failure === "audit") {
        await pool.query(
          `CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.details->>'sourceInstanceId'='${instance}' AND NEW.details->>'sourceId'='unmatched-b' THEN RAISE EXCEPTION 'synthetic late failure'; END IF; RETURN NEW; END $$`,
        );
        await pool.query(
          `CREATE TRIGGER ${trigger} BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION ${trigger}()`,
        );
      }
      try {
        await assert.rejects(
          importCrmPayloads(pool, input, approved, { dryRun: false }),
        );
        assert.equal(await count(instance), 0);
        assert.equal(
          (
            await pool.query("SELECT id FROM lead WHERE id=$1", [
              mappings[0].targetId,
            ])
          ).rowCount,
          0,
        );
        assert.equal(
          (await pool.query("SELECT name FROM lead WHERE id=$1", [lead]))
            .rows[0].name,
          "Existing lead",
        );
      } finally {
        if (failure === "audit") {
          await pool.query(`DROP TRIGGER ${trigger} ON audit_event`);
          await pool.query(`DROP FUNCTION ${trigger}()`);
        }
      }
    }
  },
);

test(
  "Created inquiry supports existing note/task projection and rejects a second source identity for its archived submission",
  { skip: !base },
  async () => {
    const { owner, input } = await setup();
    const mappings = additiveInput(input);
    input.records.leadNotes.push({
      ...input.records.leadNotes[0],
      id: "unmatched-note",
      leadId: "unmatched-a",
    });
    input.records.leadTasks.push({
      ...input.records.leadTasks[0],
      id: "unmatched-task",
      leadId: "unmatched-a",
    });
    const approved = additiveReview(input, owner, mappings);
    assert.equal(
      (await importCrmPayloads(pool, input, approved, { dryRun: false }))
        .created,
      10,
    );
    assert.equal(
      (await importCrmPayloads(pool, input, approved, { dryRun: false }))
        .replayed,
      10,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT lead_id FROM lead_note WHERE source_instance_id=$1 AND source_note_id='unmatched-note'",
          [input.sourceInstanceId],
        )
      ).rows[0].lead_id,
      mappings[0].targetId,
    );
    const later = structuredClone(input);
    for (const key of Object.keys(later.records)) later.records[key] = [];
    later.records.leads = [{ ...input.records.leads[1], id: "renamed-source" }];
    const mapping = [
      {
        action: "create_separate_inquiry",
        sourceId: "renamed-source",
        targetId: randomUUID(),
      },
    ];
    await assert.rejects(
      importCrmPayloads(pool, later, additiveReview(later, owner, mapping), {
        dryRun: false,
      }),
      /submission_already_archived/,
    );
  },
);
