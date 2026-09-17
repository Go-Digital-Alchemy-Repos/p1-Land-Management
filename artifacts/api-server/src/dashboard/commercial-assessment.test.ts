import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";

const testUrl = process.env.COMMERCIAL_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    testUrl !== process.env.DASHBOARD_DATABASE_URL
  )
    throw Error("Disposable fixture required");
}
after(() => pool.end());

test("commercial assessment baselines are sales-only, idempotent, versioned and review-immutable", { skip: !testUrl }, async () => {
  const express = (await import("express")).default;
  const { auth } = await import("./auth");
  const { commercialAssessmentApi } = await import("./commercial-assessment.routes");
  const actors: Record<string, string> = {};
  for (const role of ["owner", "manager", "sales", "dispatch", "finance", "crew", "client"]) {
    const userId = randomUUID();
    actors[role] = userId;
    await pool.query(
      `INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)`,
      [userId, role, `${userId}@assessment.synthetic.test`],
    );
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,$2)", [userId, role]);
  }
  const leadId = randomUUID();
  await pool.query(
    "INSERT INTO lead(id,name,email,location,description,inquiry_type) VALUES($1,'Commercial assessor','assessment@example.test','Carolinas','Assessment request','commercial_site_assessment')",
    [leadId],
  );
  const original = auth.api.getSession;
  (auth.api as any).getSession = async ({ headers }: any) => ({
    user: { id: actors[headers.get("x-test-role")], name: "Synthetic", emailVerified: true, twoFactorEnabled: true },
    session: { id: randomUUID() },
  });
  const app = express();
  app.use(express.json());
  app.use("/api/v1", commercialAssessmentApi);
  app.use((error: any, _req: any, res: any, _next: any) =>
    res.status(error.status || 500).json({ error: error.message }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const call = (role: string, path: string, body?: unknown, method = "POST") =>
    fetch(base + path, {
      method: body === undefined ? "GET" : method,
      headers: { "x-test-role": role, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    const path = `/commercial-inquiries/${leadId}/assessment-baselines`;
    for (const role of ["dispatch", "finance", "crew", "client"])
      assert.equal((await call(role, path)).status, 403);
    assert.equal(
      (await call("sales", path, {
        operationId: randomUUID(), expectedLeadVersion: 1, propertyId: randomUUID(), title: "Mismatched property",
      })).status,
      409,
    );
    const operationId = randomUUID();
    const create = { operationId, expectedLeadVersion: 1, title: "Initial site assessment", scopeNote: "Establish exterior baseline." };
    const first = await call("sales", path, create);
    assert.equal(first.status, 201);
    const receipt = await first.json() as any;
    assert.ok(receipt.assessmentId);
    const retry = await call("sales", path, create);
    assert.equal(retry.status, 201);
    assert.deepEqual(await retry.json(), receipt);
    assert.equal((await pool.query("SELECT count(*) FROM commercial_assessment WHERE lead_id=$1", [leadId])).rows[0].count, "1");
    assert.equal((await pool.query("SELECT version FROM lead WHERE id=$1", [leadId])).rows[0].version, 2);
    const save = await call("manager", `${path}/${receipt.assessmentId}`, {
      expectedVersion: 1,
      title: "Initial site assessment",
      scopeNote: "Exterior baseline documented.",
      findings: [{ category: "stormwater_drainage", conditionLabel: "Observed", observation: "Inspect swale drainage after heavy rain.", priority: "high" }],
      recommendations: [{ findingIndex: 0, recommendation: "Document drainage flow and corrective options.", priority: "high" }],
    }, "PUT");
    assert.equal(save.status, 200);
    const saved = await save.json() as any;
    assert.equal(saved.version, 2);
    assert.equal(saved.findings.length, 1);
    assert.equal(saved.recommendations[0].finding_id, saved.findings[0].id);
    const review = await call("owner", `${path}/${receipt.assessmentId}/review`, { expectedVersion: 2 });
    assert.equal(review.status, 200);
    const reviewed = await review.json() as any;
    assert.equal(reviewed.status, "reviewed");
    assert.equal(reviewed.version, 3);
    assert.equal(reviewed.reviews.length, 1);
    assert.match(reviewed.reviews[0].snapshot_sha256, /^[a-f0-9]{64}$/);
    assert.equal((await call("sales", `${path}/${receipt.assessmentId}`, { expectedVersion: 3, title: "Initial site assessment", scopeNote: null, findings: [], recommendations: [] }, "PUT")).status, 409);
    await assert.rejects(
      pool.query("UPDATE commercial_assessment_review SET snapshot='{}' WHERE assessment_id=$1", [receipt.assessmentId]),
      /append-only/,
    );
    const archive = await call("sales", `${path}/${receipt.assessmentId}/archive`, { expectedVersion: 3, reason: "Replaced after updated site walk" });
    assert.equal(archive.status, 200);
    assert.equal((await archive.json() as any).status, "archived");
    assert.equal((await call("sales", path, { operationId: randomUUID(), expectedLeadVersion: 2, title: "Updated site assessment" })).status, 201);
    // This sales workflow never writes the operational assessment availability calendar.
    assert.equal((await pool.query("SELECT count(*) FROM assessment_slot WHERE property_id IS NULL AND booked_by=$1", [actors.sales])).rows[0].count, "0");
    assert.equal((await pool.query("SELECT count(*) FROM audit_event WHERE action LIKE 'commercial.assessment_%' AND entity_id=$1", [receipt.assessmentId])).rows[0].count, "4");
  } finally {
    (auth.api as any).getSession = original;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
