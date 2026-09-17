import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { fixture, at } from "./crm-payload-fixture.mjs";
import { prepareCrmPayloads } from "./prepare-crm-payloads.mjs";
import { importCrmPayloads } from "./import-crm-payloads.mjs";
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
async function setup() {
  const owner = randomUUID(),
    person = randomUUID(),
    lead = randomUUID(),
    client = randomUUID(),
    instance = randomUUID(),
    submission = randomUUID();
  for (const [id, role] of [
    [owner, "owner"],
    [person, "member"],
  ]) {
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [id, "Synthetic " + role, id + "@example.test"],
    );
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,$2)", [
      id,
      role,
    ]);
  }
  await pool.query(
    "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,ARRAY['revenue.sales','customers.clients'])",
    [person],
  );
  await pool.query(
    "INSERT INTO client(id,name,email) VALUES($1,'Existing customer','existing@example.test')",
    [client],
  );
  await pool.query(
    "INSERT INTO lead(id,name,email,location,description,converted_client_id) VALUES($1,'Existing lead','existing@example.test','Existing site','Existing intake',$2)",
    [lead, client],
  );
  await pool.query(
    "INSERT INTO commercial_intake_receipt(id,source_instance_id,submission_id,event_id,schema_version,payload_sha256,accepted_at,lead_id,raw_intake) VALUES($1,$2,$3,$4,1,$5,now(),$6,'{\"original\":true}')",
    [randomUUID(), instance, submission, randomUUID(), "a".repeat(64), lead],
  );
  const input = fixture();
  input.sourceInstanceId = instance;
  input.records.leads[0].formSubmissionId = submission;
  input.targetInventory = {
    dashboardLeads: [{ id: lead, status: "new", convertedClientId: client }],
    dashboardClients: [{ id: client }],
    canonicalUsers: [{ id: person }],
    identityLinks: [
      { coreUserId: "source-user", canonicalUserId: person, revokedAt: null },
    ],
    recordLinks: [],
    receipts: [
      { sourceInstanceId: instance, submissionId: submission, leadId: lead },
    ],
  };
  input.records.leadTasks[0].completed = false;
  input.records.leadTasks[0].assignedToId = "source-user";
  return { owner, person, lead, client, instance, input };
}
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
