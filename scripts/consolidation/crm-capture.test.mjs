import { test } from "node:test";
import assert from "node:assert/strict";
import {
  captureCrmMetadata,
  combineCrmMetadata,
  projections,
} from "./crm-capture.mjs";
function client(overrides = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("current_timestamp"))
        return {
          rows: [
            {
              capturedAt: "2026-09-19T00:00:00.000Z",
              readOnly: "on",
              isolation: "repeatable read",
              snapshot: "1:2:",
              ...overrides,
            },
          ],
        };
      if (sql.includes("pg_tables"))
        return {
          rows: [
            "crm_client_notes",
            "crm_client_tasks",
            "crm_clients",
            "crm_lead_notes",
            "crm_lead_tasks",
            "crm_leads",
          ].map((tablename) => ({ tablename })),
        };
      if (sql.includes("to_regclass")) return { rows: [{ present: false }] };
      if (sql.includes("count(")) return { rows: [{ count: "0" }] };
      return { rows: [] };
    },
  };
}
test("explicit metadata projections omit payload and account secrets", () => {
  for (const sql of Object.values(projections)) {
    assert.match(sql, /^SELECT /);
    assert.doesNotMatch(
      sql,
      /\b(email|password|token|body|title|description|payload|name|address)\b|SELECT\s+\*/i,
    );
  }
});
test("both transactions are repeatable-read read-only; absent mapping tables remain explicit", async () => {
  const coreClient = client(),
    dashboardClient = client();
  const core = await captureCrmMetadata(coreClient, "core", "fixture"),
    dashboard = await captureCrmMetadata(
      dashboardClient,
      "dashboard",
      "fixture",
    );
  for (const c of [coreClient, dashboardClient]) {
    assert.equal(
      c.calls[0].sql,
      "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    assert.equal(c.calls.at(-1).sql, "COMMIT");
  }
  assert.equal(core.evidence.identityLinksAvailable, false);
  assert.equal(dashboard.evidence.archiveMappingsAvailable, false);
  assert.equal(core.sourceFreezeVerified, false);
  assert.equal(dashboard.releaseApproval, false);
  assert.deepEqual(combineCrmMetadata(core, dashboard).recordLinks, []);
  assert.deepEqual(
    dashboardClient.calls.find((c) => c.sql.includes("submission_id::text"))
      .params,
    ["fixture"],
  );
});
test("fails closed on read-only drift and verifies captured digest", async () => {
  const c = client({ readOnly: "off" });
  await assert.rejects(captureCrmMetadata(c, "core", "fixture"));
  assert.equal(c.calls.at(-1).sql, "ROLLBACK");
  const core = await captureCrmMetadata(client(), "core", "fixture"),
    dashboard = await captureCrmMetadata(client(), "dashboard", "fixture");
  dashboard.records.dashboardClients.push({ id: "tampered" });
  assert.throws(() => combineCrmMetadata(core, dashboard), /digest/);
});
test("source schema drift and projection failures roll back the snapshot", async () => {
  for (const failure of ["schema", "projection"]) {
    const c = client();
    const query = c.query.bind(c);
    c.query = async (sql, params) => {
      if (failure === "schema" && sql.includes("pg_tables")) {
        c.calls.push({ sql, params });
        return { rows: [] };
      }
      if (
        failure === "projection" &&
        sql === projections.coreLeads + " LIMIT 100001"
      ) {
        c.calls.push({ sql, params });
        throw Error("synthetic read failure");
      }
      return query(sql, params);
    };
    await assert.rejects(captureCrmMetadata(c, "core", "fixture"));
    assert.equal(c.calls.at(-1).sql, "ROLLBACK");
    assert.equal(
      c.calls.some(({ sql }) => sql === "COMMIT"),
      false,
    );
  }
});
test("wrong-source captures and invalid issuer configurations fail closed", async () => {
  const c = client();
  await assert.rejects(captureCrmMetadata(c, "core", "invalid issuer"));
  assert.equal(c.calls.length, 0);
  const core = await captureCrmMetadata(client(), "core", "fixture");
  const dashboard = await captureCrmMetadata(client(), "dashboard", "another");
  assert.throws(() => combineCrmMetadata(core, dashboard), /sources differ/);
});
