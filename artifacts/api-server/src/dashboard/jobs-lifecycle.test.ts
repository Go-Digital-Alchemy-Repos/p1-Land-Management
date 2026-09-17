import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Jobs lifecycle tests require an isolated local origin");
after(() => pool.end());

test(
  "approved estimates convert one-time Jobs once, protect public tokens, and keep recurring programs pending activation",
  { skip: !base },
  async () => {
    const clientId = randomUUID(), propertyId = randomUUID(), managerId = randomUUID(), contactId = randomUUID();
    const sessionToken = randomUUID();
    await pool.query("INSERT INTO client(id,name) VALUES($1,'Lifecycle client')", [clientId]);
    await pool.query("INSERT INTO property(id,client_id,name,address,lifecycle) VALUES($1,$2,'Lifecycle property','Fixture address','operational')", [propertyId, clientId]);
    await pool.query("INSERT INTO contact(id,client_id,name,email,kind) VALUES($1,$2,'Approval contact','approval@example.test','primary')", [contactId, clientId]);
    await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [managerId, "Lifecycle manager", `${managerId}@example.test`]);
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,'manager')", [managerId]);
    await pool.query('INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3)', [randomUUID(), sessionToken, managerId]);
    const cookie = "p1-dashboard.session_token=" + encodeURIComponent(sessionToken + "." + createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(sessionToken).digest("base64"));
    const auth = async (path: string, body?: unknown) => {
      const response = await fetch(base + "/api/v1" + path, { method: body === undefined ? "GET" : "POST", headers: { origin: base!, cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() as any };
    };
    const publicRequest = async (path: string, body?: unknown) => {
      const response = await fetch(base + "/api/public" + path, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() as any };
    };
    const create = async (kind: "one_time" | "recurring", title: string, requestId?: string) => {
      const template = kind === "recurring" ? await auth("/agreement-templates", { name: `Fixture ${randomUUID()}`, body: "Immutable fixture terms" }) : null;
      assert.equal(template?.status || 201, 201);
      const body: any = { propertyId, title, scope: "Fixture scope", terms: "Client terms", kind, lineItems: [{ description: "Service", quantity: 1, unitPriceCents: 25000 }] };
      if (kind === "recurring") {
        body.agreementTemplateId = template!.body.id;
        body.recurring = { cadence: "weekly", intervalCount: 1, startsOn: "2030-01-01", endsOn: "2030-12-31", localTime: "08:00", billingMode: "per_visit", unitAmountCents: 25000, periods: [] };
      }
      const created = await auth(requestId ? `/requests/${requestId}/estimates` : "/estimates", body);
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const sent = await auth(`/estimates/${created.body.id}/send`, { recipientContactIds: [contactId] });
      assert.equal(sent.status, 200, JSON.stringify(sent.body));
      const message = (await pool.query("SELECT payload FROM outbox WHERE dedup_key LIKE $1 ORDER BY created_at DESC LIMIT 1", [`estimate:${created.body.id}:%`])).rows[0];
      const token = String(message.payload.text).split("/").at(-1)!;
      return { estimateId: created.body.id as string, token };
    };

    const request = await auth("/requests", { propertyId, description: "Fixture inbound request", source: "manual" });
    assert.equal(request.status, 201);
    const oneTime = await create("one_time", "One-time fixture", request.body.id);
    const approval = await publicRequest(`/estimates/${oneTime.token}/decision`, { status: "approved" });
    assert.equal(approval.status, 200, JSON.stringify(approval.body));
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM work_order WHERE estimate_id=$1", [oneTime.estimateId])).rows[0].n, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM service_request_conversion WHERE service_request_id=$1", [request.body.id])).rows[0].n, 1);
    assert.equal((await publicRequest(`/estimates/${oneTime.token}/decision`, { status: "approved" })).status, 404);

    const expired = await create("one_time", "Expired fixture");
    await pool.query("UPDATE estimate SET expires_at=now()-interval '1 minute' WHERE id=$1", [expired.estimateId]);
    assert.equal((await publicRequest(`/estimates/${expired.token}`)).status, 404);

    const recurring = await create("recurring", "Recurring fixture");
    const recurringApproval = await publicRequest(`/estimates/${recurring.token}/decision`, { status: "approved" });
    assert.equal(recurringApproval.status, 200, JSON.stringify(recurringApproval.body));
    const program = (await pool.query("SELECT r.paused,a.status,a.template_snapshot FROM recurring_service r JOIN service_agreement a ON a.id=r.agreement_id WHERE r.estimate_id=$1", [recurring.estimateId])).rows[0];
    assert.deepEqual({ paused: program.paused, status: program.status, snapshot: program.template_snapshot }, { paused: true, status: "draft", snapshot: "Immutable fixture terms" });
    assert.equal((await publicRequest(`/estimates/${recurring.token}`)).status, 404);
  },
);
