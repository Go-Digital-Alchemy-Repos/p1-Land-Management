import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setupCrmImportFixture } from "./crm-import-fixture.mjs";
import { fixture } from "./crm-payload-fixture.mjs";
import { exportCrmPayloads } from "./export-crm-payloads.mjs";
import { prepareCrmImportPlan } from "./import-crm-payloads.mjs";
import { fencedCrmImport } from "./fenced-crm-import.mjs";
const enabled = !!process.env.CRM_FENCE_TEST_DATABASE_URL;
if (enabled) {
  const u = new URL(process.env.CRM_FENCE_TEST_DATABASE_URL);
  if (
    !["localhost", "127.0.0.1"].includes(u.hostname) ||
    !/test|fixture/.test(u.pathname)
  )
    throw Error("Named disposable loopback DB required");
}
const require = createRequire(
  new URL("../../artifacts/api-server/package.json", import.meta.url),
);
const { Pool } = require("pg");
const target = new Pool({
  connectionString: process.env.CRM_FENCE_TEST_DATABASE_URL,
});
after(() => target.end());
async function setup() {
  const { owner, instance } = await setupCrmImportFixture(target);
  const schema = "crm_fence_" + randomUUID().replaceAll("-", "");
  await target.query(`CREATE SCHEMA ${schema}`);
  const source = new Pool({
    connectionString: process.env.CRM_FENCE_TEST_DATABASE_URL,
    options: `-c search_path=${schema}`,
    max: 5,
  });
  await source.query(
    "CREATE TABLE users(id varchar PRIMARY KEY);CREATE TABLE cms_forms(id varchar PRIMARY KEY,slug text);CREATE TABLE cms_form_submissions(id varchar PRIMARY KEY,form_id varchar REFERENCES cms_forms(id));CREATE TABLE cms_form_effect_jobs(id varchar PRIMARY KEY,submission_id varchar REFERENCES cms_form_submissions(id),status text,payload jsonb)",
  );
  for (const name of [
    "0021_crm.sql",
    "0022_crm_clients.sql",
    "0023_crm_client_profile.sql",
  ])
    await source.query(
      await readFile(
        new URL("../../platform/p1-core/migrations/" + name, import.meta.url),
        "utf8",
      ),
    );
  const form = randomUUID(),
    submission = randomUUID();
  await source.query("INSERT INTO cms_forms VALUES($1,'p1-estimate')", [form]);
  await source.query("INSERT INTO cms_form_submissions VALUES($1,$2)", [
    submission,
    form,
  ]);
  await source.query(
    "INSERT INTO cms_form_effect_jobs VALUES($1,$2,'completed','{\"kind\":\"crm_intake\"}')",
    [randomUUID(), submission],
  );
  const row = {
    ...fixture().records.leads[0],
    id: randomUUID(),
    formSubmissionId: submission,
    stage: "contacted",
    ownerId: null,
    formData: { address: "Synthetic site", services: [] },
  };
  const keys = Object.keys(row),
    snake = (k) => k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
  await source.query(
    `INSERT INTO crm_leads(${keys.map(snake).join(",")}) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")})`,
    keys.map((k) =>
      ["formData", "metadata"].includes(k) ? JSON.stringify(row[k]) : row[k],
    ),
  );
  const { input } = await exportCrmPayloads(source, target, {
    sourceInstanceId: instance,
    sourceTimezone: "UTC",
  });
  const inquiryMappings = [
    {
      action: "create_separate_inquiry",
      sourceId: row.id,
      targetId: randomUUID(),
    },
  ];
  const review = {
    schemaVersion: 2,
    operation: "import_reviewed_crm",
    reviewedBy: owner,
    sourceFreezeVerified: true,
    inquiryMappings,
    manifestSha256: prepareCrmImportPlan(input, inquiryMappings).manifestSha256,
  };
  return {
    source,
    input,
    review,
    form,
    submission,
    row,
    options: { sourceInstanceId: instance, sourceTimezone: "UTC" },
    async close() {
      await source.end();
      await target.query(`DROP SCHEMA ${schema} CASCADE`);
    },
  };
}
test(
  "fence dry-run/apply/replay uses actual source export and independently verifies target",
  { skip: !enabled },
  async () => {
    const f = await setup();
    try {
      const dry = await fencedCrmImport(
        f.source,
        target,
        f.input,
        f.review,
        f.options,
      );
      assert.equal(dry.mode, "dry-run");
      assert.equal(dry.targetResult.wouldCreate, 1);
      const apply = await fencedCrmImport(f.source, target, f.input, f.review, {
        ...f.options,
        dryRun: false,
      });
      assert.equal(apply.verified, true);
      assert.equal(apply.targetResult.created, 1);
      const replay = await fencedCrmImport(
        f.source,
        target,
        f.input,
        f.review,
        { ...f.options, dryRun: false },
      );
      assert.equal(replay.targetResult.replayed, 1);
    } finally {
      await f.close();
    }
  },
);
test(
  "source drift, pending effects, handoff eligibility and newly added relationships fail before target import",
  { skip: !enabled },
  async () => {
    for (const mode of [
      "content",
      "pending",
      "handoff",
      "relationship",
      "slug",
    ]) {
      const f = await setup();
      try {
        if (mode === "content")
          await f.source.query(
            "UPDATE crm_leads SET message='changed' WHERE id=$1",
            [f.row.id],
          );
        if (mode === "pending")
          await f.source.query(
            "UPDATE cms_form_effect_jobs SET status='processing'",
          );
        if (mode === "handoff")
          await f.source.query(
            'UPDATE cms_form_effect_jobs SET payload=\'{"kind":"commercial_dashboard_intake"}\'',
          );
        if (mode === "relationship")
          await f.source.query(
            "INSERT INTO crm_lead_notes(lead_id,body) VALUES($1,'new note')",
            [f.row.id],
          );
        if (mode === "slug")
          await f.source.query(
            "UPDATE cms_forms SET slug='p1-commercial-assessment'",
          );
        await assert.rejects(
          fencedCrmImport(f.source, target, f.input, f.review, {
            ...f.options,
            dryRun: false,
          }),
          /crm_fence_/,
        );
        assert.equal(
          (
            await target.query("SELECT id FROM lead WHERE id=$1", [
              f.review.inquiryMappings[0].targetId,
            ])
          ).rowCount,
          0,
        );
      } finally {
        await f.close();
      }
    }
  },
);
test(
  "held fence blocks exact source edits while unrelated new public intake commits",
  { skip: !enabled },
  async () => {
    const f = await setup();
    let proceed, arrived;
    const ready = new Promise((r) => (arrived = r)),
      release = new Promise((r) => (proceed = r));
    let connections = 0;
    const pausedTarget = {
      async connect() {
        const c = await target.connect();
        connections++;
        const hold = connections === 2;
        return {
          async query(...a) {
            if (hold && a[0] === "BEGIN") {
              arrived();
              await release;
            }
            return c.query(...a);
          },
          release: (...a) => c.release(...a),
        };
      },
    };
    const operation = fencedCrmImport(
      f.source,
      pausedTarget,
      f.input,
      f.review,
      { ...f.options, dryRun: false },
    );
    try {
      await ready;
      const c = await f.source.connect();
      try {
        await c.query("SET lock_timeout='100ms'");
        await assert.rejects(
          c.query("UPDATE crm_leads SET message='blocked' WHERE id=$1", [
            f.row.id,
          ]),
          (e) => e.code === "55P03",
        );
        await assert.rejects(
          c.query(
            "INSERT INTO crm_lead_notes(lead_id,body) VALUES($1,'blocked')",
            [f.row.id],
          ),
          (e) => e.code === "55P03",
        );
        await assert.rejects(
          c.query("UPDATE cms_forms SET slug='changed' WHERE id=$1", [f.form]),
          (e) => e.code === "55P03",
        );
        await c.query("BEGIN");
        const id = randomUUID();
        await c.query("INSERT INTO cms_form_submissions VALUES($1,$2)", [
          id,
          f.form,
        ]);
        await c.query(
          "INSERT INTO cms_form_effect_jobs VALUES($1,$2,'queued','{\"kind\":\"crm_intake\"}')",
          [randomUUID(), id],
        );
        await c.query("COMMIT");
      } finally {
        c.release();
      }
      proceed();
      assert.equal((await operation).verified, true);
    } finally {
      proceed();
      await operation.catch(() => {});
      await f.close();
    }
  },
);
test(
  "lost commit response requires exact reconciliation; retry retains committed inquiry",
  { skip: !enabled },
  async () => {
    const f = await setup();
    let connections = 0;
    const uncertain = {
      async connect() {
        const c = await target.connect();
        const active = ++connections === 2;
        return {
          async query(...a) {
            const result = await c.query(...a);
            if (active && a[0] === "COMMIT")
              throw Error("synthetic lost response");
            return result;
          },
          release: (...a) => c.release(...a),
        };
      },
    };
    try {
      await assert.rejects(
        fencedCrmImport(f.source, uncertain, f.input, f.review, {
          ...f.options,
          dryRun: false,
        }),
        (e) =>
          e.message ===
            "crm_fence_target_outcome_requires_exact_reconciliation" &&
          e.targetMayHaveCommitted,
      );
      assert.equal(
        (
          await target.query("SELECT id FROM lead WHERE id=$1", [
            f.review.inquiryMappings[0].targetId,
          ])
        ).rowCount,
        1,
      );
      const replay = await fencedCrmImport(
        f.source,
        target,
        f.input,
        f.review,
        { ...f.options, dryRun: false },
      );
      assert.equal(replay.targetResult.replayed, 1);
    } finally {
      await f.close();
    }
  },
);

test(
  "source lock acquisition is bounded and never starts target writes on timeout",
  { skip: !enabled },
  async () => {
    const f = await setup(),
      blocking = await f.source.connect();
    try {
      await blocking.query("BEGIN");
      await blocking.query("SELECT id FROM cms_forms WHERE id=$1 FOR UPDATE", [
        f.form,
      ]);
      const started = Date.now();
      await assert.rejects(
        fencedCrmImport(f.source, target, f.input, f.review, {
          ...f.options,
          dryRun: false,
        }),
        (e) =>
          e.message === "crm_fence_source_check_failed" &&
          !e.targetMayHaveCommitted,
      );
      assert(Date.now() - started >= 4500);
      assert(Date.now() - started < 12000);
      assert.equal(
        (
          await target.query("SELECT id FROM lead WHERE id=$1", [
            f.review.inquiryMappings[0].targetId,
          ])
        ).rowCount,
        0,
      );
    } finally {
      await blocking.query("ROLLBACK");
      blocking.release();
      await f.close();
    }
  },
);
