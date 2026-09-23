import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
import { revokeManagedSessions } from "./user-management.service";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Owner impersonation requires an isolated local server");
after(() => pool.end());

test("Owner can seed login-free roles, act with target grants, and return with an audit trail", { skip: !base }, async () => {
  const ownerId = randomUUID(), staffId = randomUUID(), sessionId = randomUUID();
  const token = randomUUID();
  const cookie = "p1-dashboard.session_token=" + encodeURIComponent(
    token + "." + createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64"),
  );
  const headers = { cookie, origin: base!, "content-type": "application/json" };
  const request = (path: string, method = "GET", body?: unknown, extraHeaders = headers) =>
    fetch(`${base}/api/v1${path}`, { method, headers: extraHeaders,
      body: body === undefined ? undefined : JSON.stringify(body) });
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified","twoFactorEnabled") VALUES($1,\'Test Owner\',$2,true,true),($3,\'Unprivileged\',$4,true,false)',
    [ownerId, `${ownerId}@example.test`, staffId, `${staffId}@example.test`]);
  await pool.query("INSERT INTO staff_profile(user_id,role,mfa_required) VALUES($1,'owner',true),($2,'member',false)",
    [ownerId, staffId]);
  await pool.query('INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')',
    [sessionId, token, ownerId]);
  await pool.query("INSERT INTO session_assurance(session_id) VALUES($1)", [sessionId]);

  assert.equal((await request("/impersonation/targets", "GET", undefined,
    { origin: base!, "content-type": "application/json" } as typeof headers)).status, 401);
  const seeded = await request("/impersonation/demo-personas", "POST", {});
  assert.equal(seeded.status, 201);
  const people = ((await seeded.json()) as { items: Array<{ id: string; role: string }> }).items;
  assert.deepEqual(people.map((person) => person.role),
    ["manager", "dispatch", "sales", "finance", "crew", "client"]);
  assert.equal((await pool.query(
    "SELECT count(*)::int AS total FROM account WHERE \"userId\"=ANY($1)",
    [people.map((person) => person.id)],
  )).rows[0].total, 0, "demo identities have no password or provider credential");
  assert.equal((await request("/impersonation/demo-personas", "POST", {})).status, 201);
  assert.equal((await pool.query("SELECT count(*)::int AS total FROM dashboard_demo_persona")).rows[0].total, 6);

  const sales = people.find((person) => person.role === "sales")!;
  const started = await request("/impersonation", "POST", { targetId: sales.id });
  assert.equal(started.status, 201);
  const me = await request("/me");
  assert.equal(me.status, 200);
  const identity = await me.json() as any;
  assert.equal(identity.id, sales.id);
  assert.equal(identity.role, "sales");
  assert.equal(identity.impersonation.ownerId, ownerId);
  assert.equal(identity.impersonation.demo, true);
  assert.equal((await request("/user-management/users")).status, 403,
    "Owner permissions must not leak into target context");
  const created = await request("/leads", "POST", {
    name: "Lorem Ipsum · synthetic", email: "lorem@example.test",
    location: "Synthetic location", description: "Lorem ipsum dolor sit amet.",
  });
  assert.equal(created.status, 201, "target Sales grant authorizes a real API write");
  const leadId = ((await created.json()) as { id: string }).id;
  const logged = await pool.query(
    "SELECT user_id,entity_id,details FROM audit_event WHERE action='impersonation.request' AND entity_id=$1 ORDER BY created_at DESC LIMIT 1",
    [sales.id],
  );
  assert.equal(logged.rows[0].user_id, ownerId);
  assert.equal(logged.rows[0].details.path, "/leads");
  assert.equal((await pool.query("SELECT id FROM lead WHERE id=$1", [leadId])).rowCount, 1);
  const security = await fetch(`${base}/api/auth/change-password`, {
    method: "POST", headers, body: JSON.stringify({ currentPassword: "x", newPassword: "y" }),
  });
  assert.equal(security.status, 403, "target UI cannot mutate Owner credentials");

  const client = people.find((person) => person.role === "client")!;
  assert.equal((await request("/impersonation", "POST", { targetId: client.id })).status, 201);
  assert.equal(((await (await request("/me")).json()) as any).role, "client");
  assert.equal((await request("/leads")).status, 403);
  assert.equal((await pool.query("SELECT count(*)::int AS total FROM client_access WHERE user_id=$1", [client.id])).rows[0].total, 1);
  const crew = people.find((person) => person.role === "crew")!;
  assert.equal((await request("/impersonation", "POST", { targetId: crew.id })).status, 201);
  assert.equal(((await (await request("/me")).json()) as any).role, "crew");
  assert.equal((await request("/leads")).status, 403);
  assert.equal((await pool.query("SELECT count(*)::int AS total FROM work_order WHERE assigned_to=$1", [crew.id])).rows[0].total, 1);
  const assigned = (await pool.query("SELECT id,version FROM work_order WHERE assigned_to=$1", [crew.id])).rows[0];
  const field = await request("/field/sync", "POST", { events: [{
    id: randomUUID(), workOrderId: assigned.id, baseVersion: assigned.version,
    kind: "note", payload: { text: "Lorem ipsum demo field note" },
    capturedAt: new Date().toISOString(),
  }] });
  assert.equal(field.status, 200);
  assert.equal(((await field.json()) as any).results[0].status, "accepted",
    "Owner can exercise a crew action with the crew's actual grant");

  const stopped = await request("/impersonation/stop", "POST", {});
  assert.equal(stopped.status, 200);
  assert.equal(((await (await request("/me")).json()) as any).id, ownerId);
  assert.equal((await pool.query("SELECT count(*)::int AS total FROM audit_event WHERE user_id=$1 AND action IN ('impersonation.started','impersonation.stopped')", [ownerId])).rows[0].total, 4);
  assert.equal((await request("/impersonation", "POST", { targetId: ownerId })).status, 404);
  assert.equal((await request("/impersonation", "POST", { targetId: randomUUID() })).status, 404);

  await request("/impersonation", "POST", { targetId: sales.id });
  await pool.query("UPDATE dashboard_impersonation SET expires_at=now()-interval '1 second' WHERE session_id=$1", [sessionId]);
  assert.equal((await request("/me")).status, 403,
    "an expired target page cannot silently execute with Owner grants");
  assert.equal((await request("/impersonation/stop", "POST", {})).status, 200);
  await request("/impersonation", "POST", { targetId: sales.id });
  await revokeManagedSessions(ownerId, sales.id);
  assert.equal((await request("/me")).status, 403,
    "revoking target sessions leaves stale target pages locked, not elevated to Owner");
  assert.equal((await request("/impersonation/stop", "POST", {})).status, 200);
  await request("/impersonation", "POST", { targetId: sales.id });
  await pool.query("UPDATE staff_profile SET active=false WHERE user_id=$1", [sales.id]);
  assert.equal((await request("/me")).status, 403,
    "deactivated targets must not silently regain Owner privileges");
  assert.equal((await request("/impersonation/stop", "POST", {})).status, 200,
    "Owner can always escape a deactivated target");
});
