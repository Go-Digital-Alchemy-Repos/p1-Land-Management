import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Project phase tests require an isolated local origin");
after(() => pool.end());

test("project phases preserve legacy projects, enforce lifecycle and create retry-safe draft billing intent", { skip: !base }, async () => {
  const clientId = randomUUID();
  const propertyId = randomUUID();
  const projectId = randomUUID();
  const estimateId = randomUUID();
  await pool.query("INSERT INTO client(id,name) VALUES($1,'Project phase client')", [clientId]);
  await pool.query("INSERT INTO property(id,client_id,name,address,lifecycle) VALUES($1,$2,'Project phase property','Synthetic','operational')", [propertyId, clientId]);
  await pool.query("INSERT INTO project(id,property_id,name,scope,phases) VALUES($1,$2,'Legacy compatible project','Scope',$3)", [projectId, propertyId, JSON.stringify([{ name: "Legacy JSON phase", complete: false }])]);

  const users: Record<string, { id: string; cookie: string }> = {};
  for (const role of ["manager", "finance", "client", "crew"] as const) {
    const uid = randomUUID(), sid = randomUUID(), token = randomUUID();
    await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [uid, role, `${uid}@example.test`]);
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,$2)", [uid, role]);
    await pool.query('INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3)', [sid, token, uid]);
    users[role] = { id: uid, cookie: "p1-dashboard.session_token=" + encodeURIComponent(token + "." + createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64")) };
  }
  await pool.query("INSERT INTO client_access(client_id,user_id) VALUES($1,$2)", [clientId, users.client.id]);
  await pool.query("INSERT INTO estimate(id,property_id,title,amount_cents,scope,status,approved_by,approved_at) VALUES($1,$2,'Accepted project estimate',10000,'Scope','approved',$3,now())", [estimateId, propertyId, users.manager.id]);

  async function request(role: keyof typeof users | "anonymous", path: string, body?: unknown, method = body === undefined ? "GET" : "POST") {
    const r = await fetch(base + path, {
      method,
      headers: { origin: base!, ...(body === undefined ? {} : { "content-type": "application/json" }), ...(role === "anonymous" ? {} : { cookie: users[role].cookie }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, body: await r.json() as any };
  }

  const created = await request("manager", `/api/v1/projects/${projectId}/phases`, {
    title: "Entrance renovation", scope: "Review irrigation and drive access", plannedStart: "2026-10-01", plannedEnd: "2026-10-08",
    prerequisites: [{ label: "Gate access", done: false }],
  });
  assert.equal(created.status, 201);
  const phaseId = created.body.id;
  assert.equal(created.body.version, 1);
  assert.equal((await request("finance", "/api/v1/projects")).status, 200);
  assert.equal((await request("manager", `/api/v1/projects/${projectId}/phases`, { title: "Duplicate position", scope: "", position: 0, prerequisites: [] })).status, 409);
  assert.deepEqual((await pool.query("SELECT phases FROM project WHERE id=$1", [projectId])).rows[0].phases, [{ name: "Legacy JSON phase", complete: false }]);
  assert.equal((await request("client", `/api/v1/project-phases/${phaseId}`)).status, 404);
  assert.equal((await request("finance", `/api/v1/project-phases/${phaseId}`, { expectedVersion: 1, title: "No", scope: "", prerequisites: [], reason: "No authority" }, "PATCH")).status, 403);
  assert.equal((await request("manager", `/api/v1/project-phases/${phaseId}/transitions`, { expectedVersion: 1, status: "ready", reason: "Checked prerequisites" })).status, 409);
  const ready = await request("manager", `/api/v1/project-phases/${phaseId}/transitions`, { expectedVersion: 1, status: "ready", reason: "Owner approved dispatch override", overrideReason: "Gate code confirmed by client" });
  assert.deepEqual({ status: ready.status, version: ready.body.version, state: ready.body.status }, { status: 200, version: 2, state: "ready" });
  assert.equal((await request("manager", `/api/v1/project-phases/${phaseId}`, { expectedVersion: 1, title: "Stale", scope: "", prerequisites: [], reason: "Stale save" }, "PATCH")).status, 409);
  const started = await request("manager", `/api/v1/project-phases/${phaseId}/transitions`, { expectedVersion: 2, status: "in_progress", reason: "Crew dispatched", overrideReason: "Gate code confirmed by client" });
  assert.equal(started.status, 200);
  const review = await request("manager", `/api/v1/project-phases/${phaseId}/transitions`, { expectedVersion: 3, status: "manager_review", reason: "Crew submitted completion" });
  assert.equal(review.status, 200);
  const workId = randomUUID();
  await pool.query("INSERT INTO work_order(id,property_id,title,status,project_id,project_phase_id) VALUES($1,$2,'Phase work','completed',$3,$4)", [workId, propertyId, projectId, phaseId]);
  assert.equal((await request("manager", `/api/v1/project-phases/${phaseId}/transitions`, { expectedVersion: 4, status: "accepted", reason: "Manager accepting phase" })).status, 409);
  await pool.query("UPDATE work_order SET status='reviewed' WHERE id=$1", [workId]);
  const accepted = await request("manager", `/api/v1/project-phases/${phaseId}/transitions`, { expectedVersion: 4, status: "accepted", reason: "Manager accepted reviewed work" });
  assert.deepEqual({ status: accepted.status, version: accepted.body.version, state: accepted.body.status }, { status: 200, version: 5, state: "accepted" });
  const operationId = randomUUID();
  const billingInput = { operationId, expectedPhaseVersion: 5, estimateId, title: "Entrance renovation progress", amountCents: 4000, kind: "progress" };
  const first = await request("finance", `/api/v1/project-phases/${phaseId}/billing-intents`, billingInput);
  assert.equal(first.status, 201);
  const retry = await request("finance", `/api/v1/project-phases/${phaseId}/billing-intents`, billingInput);
  assert.deepEqual({ status: retry.status, id: retry.body.id, created: retry.body.created }, { status: 200, id: first.body.id, created: false });
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM billing_draft WHERE estimate_id=$1", [estimateId])).rows[0].n, 1);
  assert.equal((await request("finance", `/api/v1/project-phases/${phaseId}/billing-intents`, { ...billingInput, amountCents: 4500 })).status, 409);
  const published = await request("manager", `/api/v1/project-phases/${phaseId}/publish`, { expectedVersion: 5, summary: "Entrance work is reviewed and complete." });
  assert.equal(published.status, 200);
  const clientView = await request("client", `/api/v1/project-phases/${phaseId}`);
  assert.equal(clientView.status, 200);
  assert.equal(clientView.body.published_summary, "Entrance work is reviewed and complete.");
  assert.equal("scope" in clientView.body, false);
  const history = await request("finance", `/api/v1/project-phases/${phaseId}/history`);
  assert.equal(history.status, 200);
  assert.ok(history.body.some((event: any) => event.event_type === "billing_intent_created"));
  assert.equal((await request("finance", `/api/v1/project-phases/${randomUUID()}/history`)).status, 404);
  await assert.rejects(() => pool.query("UPDATE project_phase_event SET reason='tampered' WHERE phase_id=$1", [phaseId]), /append-only/);
});
