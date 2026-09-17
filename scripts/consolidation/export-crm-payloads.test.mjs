import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID, createHash } from "node:crypto";
import { readFile, mkdtemp, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture, at } from "./crm-payload-fixture.mjs";
import {
  exportCrmPayloads,
  writeExportBundle,
  sourceTables,
} from "./export-crm-payloads.mjs";
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
const target = new Pool({
  connectionString: process.env.DASHBOARD_DATABASE_URL,
});
after(() => target.end());
const snake = (k) =>
  ({ addressLine1: "address_line_1", addressLine2: "address_line_2" })[k] ||
  k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
async function setup() {
  const schema = "crm_export_" + randomUUID().replaceAll("-", ""),
    owner = randomUUID(),
    person = randomUUID(),
    lead = randomUUID(),
    client = randomUUID(),
    instance = randomUUID(),
    submission = randomUUID();
  await target.query(`CREATE SCHEMA ${schema}`);
  const source = new Pool({
    connectionString: process.env.DASHBOARD_DATABASE_URL,
    options: `-c search_path=${schema}`,
    max: 3,
  });
  try {
    await source.query("CREATE TABLE users(id varchar PRIMARY KEY)");
    await source.query(
      "CREATE TABLE cms_form_submissions(id varchar PRIMARY KEY)",
    );
    for (const file of [
      "0021_crm.sql",
      "0022_crm_clients.sql",
      "0023_crm_client_profile.sql",
    ])
      await source.query(
        await readFile(
          new URL("../../platform/p1-core/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
    await source.query(
      "CREATE TABLE p1_identity_link(core_user_id varchar,canonical_user_id text,revoked_at timestamptz,initial_grant_id uuid,private_test_secret text)",
    );
    await source.query(
      "INSERT INTO users VALUES('source-user'),('missing-user')",
    );
    await source.query("INSERT INTO cms_form_submissions VALUES($1)", [
      submission,
    ]);
    const records = fixture().records;
    records.leads[0].formSubmissionId = submission;
    for (const [collection, rows] of Object.entries(records))
      for (const row of rows) {
        const keys = Object.keys(row);
        await source.query(
          `INSERT INTO ${sourceTables[collection]}(${keys.map(snake).join(",")}) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")})`,
          keys.map((k) =>
            ["formData", "metadata", "internalTags"].includes(k)
              ? JSON.stringify(row[k])
              : row[k],
          ),
        );
      }
    for (const id of [owner, person])
      await target.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [id, "Synthetic", id + "@example.test"],
      );
    await target.query(
      "INSERT INTO staff_profile(user_id,role) VALUES($1,'owner')",
      [owner],
    );
    await source.query(
      "INSERT INTO p1_identity_link VALUES('source-user',$1,NULL,$2,'do-not-export')",
      [person, randomUUID()],
    );
    await target.query(
      "INSERT INTO client(id,name,email) VALUES($1,'Target client','target@example.test')",
      [client],
    );
    await target.query(
      "INSERT INTO lead(id,name,email,location,description,converted_client_id) VALUES($1,'Target lead','target@example.test','Site','Intake',$2)",
      [lead, client],
    );
    await target.query(
      "INSERT INTO commercial_intake_receipt(id,source_instance_id,submission_id,event_id,schema_version,payload_sha256,accepted_at,lead_id,raw_intake) VALUES($1,$2,$3,$4,1,$5,now(),$6,'{}')",
      [randomUUID(), instance, submission, randomUUID(), "b".repeat(64), lead],
    );
    return {
      source,
      owner,
      person,
      instance,
      records,
      schema,
      cleanup: async () => {
        await source.end();
        await target.query(`DROP SCHEMA ${schema} CASCADE`);
      },
    };
  } catch (e) {
    await source.end();
    await target.query(`DROP SCHEMA ${schema} CASCADE`);
    throw e;
  }
}
test(
  "Read-only CRM export covers actual migrated source tables and feeds preparation/import without secret or precision loss",
  { skip: !base },
  async () => {
    const s = await setup(),
      directory = await mkdtemp(join(tmpdir(), "crm-export-bundle-"));
    try {
      const result = await exportCrmPayloads(s.source, target, {
        sourceInstanceId: s.instance,
        sourceTimezone: "UTC",
      });
      assert.deepEqual(result.input.records, s.records);
      assert.equal(result.evidence.sourceSnapshot.read_only, "on");
      assert.equal(result.evidence.targetSnapshot.read_only, "on");
      assert.equal(result.evidence.sourceFreezeVerified, false);
      assert.equal(result.manifest.counts.blocked, 0);
      assert(!JSON.stringify(result).includes("do-not-export"));
      assert.equal(
        result.input.targetInventory.identityLinks[0].canonicalUserId,
        s.person,
      );
      const output = join(directory, "complete");
      await writeExportBundle(output, result);
      assert.equal((await stat(output)).mode & 0o777, 0o700);
      const evidence = JSON.parse(
        await readFile(join(output, "evidence.json"), "utf8"),
      );
      for (const file of ["export.json", "manifest.json"]) {
        assert.equal((await stat(join(output, file))).mode & 0o777, 0o600);
        assert.equal(
          createHash("sha256")
            .update(await readFile(join(output, file)))
            .digest("hex"),
          evidence.files[file],
        );
      }
      await assert.rejects(writeExportBundle(output, result), /EEXIST/);
      const approved = {
        schemaVersion: 1,
        operation: "import_reviewed_crm",
        reviewedBy: s.owner,
        manifestSha256: result.manifest.manifestSha256,
      };
      assert.equal(
        (
          await importCrmPayloads(target, result.input, approved, {
            dryRun: false,
          })
        ).created,
        6,
      );
      const again = await exportCrmPayloads(s.source, target, {
        sourceInstanceId: s.instance,
        sourceTimezone: "UTC",
      });
      assert.equal(again.input.targetInventory.recordLinks.length, 2);
      // Existing archive links now appear as stronger explicit mappings; re-review the new manifest, replay the identical source payloads.
      assert.equal(
        (
          await importCrmPayloads(
            target,
            again.input,
            { ...approved, manifestSha256: again.manifest.manifestSha256 },
            { dryRun: false },
          )
        ).replayed,
        6,
      );
      const { execFile } = await import("node:child_process"),
        { promisify } = await import("node:util");
      const sourceUrl = new URL(process.env.DASHBOARD_DATABASE_URL);
      sourceUrl.searchParams.set("options", "-c search_path=" + s.schema);
      const cli = await promisify(execFile)(
        process.execPath,
        [
          fileURLToPath(new URL("./export-crm-payloads.mjs", import.meta.url)),
          "--source-instance",
          s.instance,
          "--source-timezone",
          "UTC",
          "--output",
          join(directory, "cli"),
        ],
        { env: { ...process.env, CRM_SOURCE_DATABASE_URL: sourceUrl.href } },
      );
      assert.equal(JSON.parse(cli.stdout).leads, 1);
      assert.equal(cli.stderr, "");
      assert(!cli.stdout.includes("Private"));
    } finally {
      await s.cleanup();
      await rm(directory, { recursive: true, force: true });
    }
  },
);
test(
  "Timezone interpretation is explicit, preserves microseconds and rejects DST gaps/folds",
  { skip: !base },
  async () => {
    const s = await setup();
    try {
      await assert.rejects(
        exportCrmPayloads(s.source, target, { sourceInstanceId: s.instance }),
        /explicit_source/,
      );
      await assert.rejects(
        exportCrmPayloads(s.source, target, {
          sourceInstanceId: s.instance,
          sourceTimezone: "not-a-zone",
        }),
        /unknown_timezone/,
      );
      const eastern = await exportCrmPayloads(s.source, target, {
        sourceInstanceId: s.instance,
        sourceTimezone: "America/New_York",
      });
      assert.equal(
        eastern.input.records.leads[0].createdAt,
        "2020-02-29T17:34:56.123456Z",
      );
      for (const time of [
        "2020-11-01 01:30:00.123456",
        "2020-03-08 02:30:00.123456",
      ]) {
        await s.source.query("UPDATE crm_leads SET created_at=$1", [time]);
        await assert.rejects(
          exportCrmPayloads(s.source, target, {
            sourceInstanceId: s.instance,
            sourceTimezone: "America/New_York",
          }),
          /ambiguous_source_time/,
        );
      }
      const utc = await exportCrmPayloads(s.source, target, {
        sourceInstanceId: s.instance,
        sourceTimezone: "UTC",
      });
      assert.equal(
        utc.input.records.leads[0].createdAt,
        "2020-03-08T02:30:00.123456Z",
      );
    } finally {
      await s.cleanup();
    }
  },
);
test(
  "Each source snapshot remains consistent through concurrent changes and rejects source schema drift",
  { skip: !base },
  async () => {
    const s = await setup();
    try {
      let changed = false;
      const wrapped = {
        connect: async () => {
          const c = await s.source.connect();
          return {
            release: (...args) => c.release(...args),
            query: async (sql, params) => {
              const result = await c.query(sql, params);
              if (!changed && sql.includes("FROM crm_leads ORDER BY id")) {
                changed = true;
                await s.source.query(
                  "UPDATE crm_clients SET name='Concurrent change'",
                );
              }
              return result;
            },
          };
        },
      };
      const result = await exportCrmPayloads(wrapped, target, {
        sourceInstanceId: s.instance,
        sourceTimezone: "UTC",
      });
      assert(changed);
      assert.equal(
        result.input.records.clients[0].name,
        s.records.clients[0].name,
      );
      assert.equal(
        (await s.source.query("SELECT name FROM crm_clients")).rows[0].name,
        "Concurrent change",
      );
      await s.source.query("ALTER TABLE crm_leads ADD COLUMN unsupported text");
      await assert.rejects(
        exportCrmPayloads(s.source, target, {
          sourceInstanceId: s.instance,
          sourceTimezone: "UTC",
        }),
        /source_column_drift/,
      );
      await s.source.query("ALTER TABLE crm_leads DROP COLUMN unsupported");
      await s.source.query("CREATE TABLE crm_extra_feature(id text)");
      await assert.rejects(
        exportCrmPayloads(s.source, target, {
          sourceInstanceId: s.instance,
          sourceTimezone: "UTC",
        }),
        /source_table_drift/,
      );
    } finally {
      await s.cleanup();
    }
  },
);

test(
  "Export rejects JSON precision/type drift and explicitly reports absent identity linkage",
  { skip: !base },
  async () => {
    const s = await setup();
    try {
      await s.source.query("UPDATE crm_leads SET metadata=$1::jsonb", [
        '{"precise":1.234567890123456789}',
      ]);
      await assert.rejects(
        exportCrmPayloads(s.source, target, {
          sourceInstanceId: s.instance,
          sourceTimezone: "UTC",
        }),
        /cannot be preserved/,
      );
      await s.source.query("UPDATE crm_leads SET metadata='{}'");
      await s.source.query("DROP TABLE p1_identity_link");
      const result = await exportCrmPayloads(s.source, target, {
        sourceInstanceId: s.instance,
        sourceTimezone: "UTC",
      });
      assert.equal(result.evidence.identityLinksAvailable, false);
      assert.deepEqual(result.input.targetInventory.identityLinks, []);
      assert(
        result.manifest.reconciliation.issues.some((issue) =>
          issue.code.includes("identity_unresolved"),
        ),
      );
      await s.source.query(
        "ALTER TABLE crm_leads ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC'",
      );
      await assert.rejects(
        exportCrmPayloads(s.source, target, {
          sourceInstanceId: s.instance,
          sourceTimezone: "UTC",
        }),
        /timestamp_type_drift/,
      );
    } finally {
      await s.cleanup();
    }
  },
);
