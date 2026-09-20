import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import {
  defaultPipelineConfig,
  pipelineConfigSchema,
  getPipelineSettings,
  savePipelineSettings,
} from "./pipeline-settings.service";
const testUrl = process.env.PIPELINE_TEST_DATABASE_URL;
if (
  testUrl &&
  (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/pipeline_settings_test$/.test(
    testUrl,
  ) ||
    testUrl !== process.env.DASHBOARD_DATABASE_URL)
)
  throw Error("Dedicated local pipeline database required");
after(() => pool.end());
test("pipeline contract preserves all six keys and excludes arbitrary colors or ambiguous labels", () => {
  assert.deepEqual(
    defaultPipelineConfig.stages.map((s) => s.key),
    ["new", "contacted", "qualified", "proposal", "won", "lost"],
  );
  const config = structuredClone(defaultPipelineConfig);
  config.stages.reverse();
  config.stages[0].label = "Closed";
  assert.equal(pipelineConfigSchema.safeParse(config).success, true);
  config.stages[1].label = "closed";
  assert.equal(pipelineConfigSchema.safeParse(config).success, false);
  assert.equal(
    pipelineConfigSchema.safeParse({ ...defaultPipelineConfig, version: 2 })
      .success,
    false,
  );
  assert.equal(
    pipelineConfigSchema.safeParse({
      ...defaultPipelineConfig,
      stages: defaultPipelineConfig.stages.slice(1),
    }).success,
    false,
  );
  for (const patch of [
    { key: "other" },
    { color: "url(javascript:test)" },
    { label: "bad\nlabel" },
    { extra: true },
  ]) {
    const stages = defaultPipelineConfig.stages.map((s, i) =>
      i === 0 ? { ...s, ...patch } : s,
    );
    assert.equal(
      pipelineConfigSchema.safeParse({ version: 1, stages }).success,
      false,
    );
  }
});
test(
  "pipeline initial concurrent writes, stale edits and audit rollback preserve business data",
  { skip: !testUrl },
  async () => {
    const actor = randomUUID();
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,\'Pipeline fixture\',$2,true)',
      [actor, actor + "@example.test"],
    );
    const before = (await pool.query("SELECT count(*) FROM lead")).rows[0]
      .count;
    assert.equal((await getPipelineSettings()).revision, 0);
    const input = { expectedRevision: 0, config: defaultPipelineConfig };
    const result = await Promise.allSettled([
      savePipelineSettings(actor, input),
      savePipelineSettings(actor, input),
    ]);
    assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      result.filter((r) => r.status === "rejected" && r.reason.status === 409)
        .length,
      1,
    );
    const saved = await getPipelineSettings();
    assert.equal(saved.revision, 1);
    await assert.rejects(savePipelineSettings(actor, input), { status: 409 });
    await pool.query(
      "CREATE FUNCTION fail_pipeline_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='sales.pipeline_settings_updated' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$",
    );
    await pool.query(
      "CREATE TRIGGER fail_pipeline_audit BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION fail_pipeline_audit()",
    );
    const config = structuredClone(defaultPipelineConfig);
    config.stages[0].label = "Incoming";
    await assert.rejects(
      savePipelineSettings(actor, { expectedRevision: 1, config }),
      /fixture audit failure/,
    );
    assert.deepEqual(await getPipelineSettings(), saved);
    await pool.query("DROP TRIGGER fail_pipeline_audit ON audit_event");
    await pool.query("DROP FUNCTION fail_pipeline_audit()");
    const next = await savePipelineSettings(actor, {
      expectedRevision: 1,
      config,
    });
    assert.equal(next.revision, 2);
    assert.equal(
      (await pool.query("SELECT count(*) FROM lead")).rows[0].count,
      before,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int n FROM audit_event WHERE action='sales.pipeline_settings_updated'",
        )
      ).rows[0].n,
      2,
    );
  },
);
test(
  "mounted pipeline endpoint permits sales reads but only Owner writes",
  { skip: !testUrl },
  async () => {
    const express = (await import("express")).default;
    const { auth } = await import("./auth");
    const { pipelineSettingsApi } = await import("./pipeline-settings");
    const ids: Record<string, string> = {};
    for (const role of ["owner", "member", "manager", "crew", "client"]) {
      const id = (ids[role] = randomUUID());
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [id, role, id + "@example.test"],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [id, role],
      );
    }
    await pool.query(
      "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
      [ids.member, ["revenue.sales"]],
    );
    const original = auth.api.getSession;
    (auth.api as any).getSession = async ({ headers }: any) =>
      ids[headers.get("x-test-role")]
        ? {
            user: {
              id: ids[headers.get("x-test-role")],
              emailVerified: true,
              name: "Fixture",
            },
            session: {},
          }
        : null;
    const app = express();
    app.use(express.json());
    app.use("/api/v1", pipelineSettingsApi);
    app.use((error: any, _req: any, res: any, _next: any) =>
      res.status(error.status || 500).json({ error: error.message }),
    );
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", r));
    const url = `http://127.0.0.1:${(server.address() as any).port}/api/v1/sales/pipeline-settings`;
    const call = (role: string, body?: unknown) =>
      fetch(url, {
        method: body ? "PUT" : "GET",
        headers: { "x-test-role": role, "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    try {
      assert.equal((await call("missing")).status, 401);
      for (const role of ["manager", "crew", "client"])
        assert.equal((await call(role)).status, 403);
      const read = await call("member");
      assert.equal(read.status, 200);
      assert.equal(read.headers.get("cache-control"), "private, no-store");
      const snapshot = (await read.json()) as any;
      const input = {
        expectedRevision: snapshot.revision,
        config: defaultPipelineConfig,
      };
      for (const role of ["member", "manager", "crew", "client"])
        assert.equal((await call(role, input)).status, 403);
      assert.equal((await call("owner", input)).status, 200);
      assert.equal((await call("owner", input)).status, 409);
    } finally {
      (auth.api as any).getSession = original;
      await new Promise<void>((r) => server.close(() => r()));
    }
  },
);
