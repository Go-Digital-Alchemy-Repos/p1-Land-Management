import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
import { postBillingDraft } from "./quickbooks";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:")) throw new Error("Requires isolated local server");
after(() => pool.end());

test("external invoicing is scoped, stale-safe, idempotent, and blocks QuickBooks posting", { skip: !base }, async () => {
  const people = new Map<string, { id: string; cookie: string }>();
  for (const role of ["owner", "finance", "manager", "sales", "dispatch", "crew", "client"]) {
    const id = randomUUID(), session = randomUUID(), token = randomUUID();
    await pool.query('INSERT INTO "user"(id,name,email,"emailVerified","twoFactorEnabled") VALUES($1,$2,$3,true,$4)', [id, role, `${id}@example.test`, role === "owner"]);
    await pool.query("INSERT INTO staff_profile(user_id,role,mfa_required) VALUES($1,$2,$3)", [id, role, role === "owner"]);
    await pool.query('INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')', [session, token, id]);
    if (role === "owner") await pool.query("INSERT INTO session_assurance(session_id) VALUES($1)", [session]);
    if (["finance", "manager"].includes(role)) await pool.query("INSERT INTO business_account_access(user_id,capabilities) VALUES($1,ARRAY['revenue.billing'])", [id]);
    people.set(role, { id, cookie: "p1-dashboard.session_token=" + encodeURIComponent(token + "." + createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64")) });
  }
  const clientId = randomUUID(), propertyId = randomUUID();
  await pool.query("INSERT INTO client(id,name) VALUES($1,'Synthetic billing client')", [clientId]);
  await pool.query("INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Synthetic property','Test-only location')", [propertyId, clientId]);
  await pool.query("INSERT INTO client_access(user_id,client_id) VALUES($1,$2)", [people.get("client")!.id, clientId]);
  const makeDraft = async () => {
    const id = randomUUID();
    await pool.query("INSERT INTO billing_draft(id,property_id,title,amount_cents,kind) VALUES($1,$2,'Synthetic service',4500,'service')", [id, propertyId]);
    return id;
  };
  const request = async (role: string, path: string, method = "GET", body?: unknown) => {
    const response = await fetch(`${base}/api/v1${path}`, { method, headers: { cookie: people.get(role)!.cookie, origin: base!, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() as any };
  };
  const draftId = await makeDraft();
  const path = `/billing/${draftId}/external-invoice`;
  const original = { operationId: randomUUID(), expectedVersion: 1, expectedAmountCents: 4500, reference: "T-1042", invoicedOn: "2026-09-23", note: "Recorded from external system" };
  for (const role of ["sales", "dispatch", "crew", "client"]) assert.equal((await request(role, path, "POST", original)).status, 403, role);
  assert.equal((await request("client", "/billing")).status, 200, "QuickBooks-enabled fixture preserves client billing");
  await pool.query("UPDATE billing_draft SET title='Synthetic service revision' WHERE id=$1", [draftId]);
  assert.equal((await request("finance", path, "POST", original)).status, 409, "stale version rejected");
  const version = (await pool.query("SELECT version FROM billing_draft WHERE id=$1", [draftId])).rows[0].version;
  assert.equal(version, 2);
  assert.equal((await request("finance", path, "POST", { ...original, expectedVersion: version, expectedAmountCents: 5000 })).status, 409, "stale amount rejected");
  const input = { ...original, expectedVersion: version };
  const recorded = await request("finance", path, "POST", input);
  assert.equal(recorded.status, 201, JSON.stringify(recorded.body));
  assert.equal(recorded.body.reference, "T-1042");
  const retry = await request("finance", path, "POST", input);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.id, recorded.body.id);
  assert.equal((await request("finance", path, "POST", { ...input, reference: "different" })).status, 409);
  assert.equal((await request("manager", path, "POST", { ...input, operationId: randomUUID() })).status, 409, "one active mark per draft");
  const list = await request("finance", "/billing");
  assert.equal(list.status, 200);
  assert.equal(list.body.find((draft: any) => draft.id === draftId).externalInvoice.id, recorded.body.id);
  assert.equal(list.body.find((draft: any) => draft.id === draftId).version, 2);
  let providerCalls = 0;
  await assert.rejects(postBillingDraft({ id: people.get("owner")!.id, role: "owner", capabilities: ["revenue.billing"] } as any, draftId, "test-item", async () => { providerCalls++; return { Invoice: { Id: "should-not-exist" } }; }), /invoiced_externally/);
  assert.equal(providerCalls, 0);

  const voidPath = `${path}/void`;
  const voidInput = { operationId: randomUUID(), reason: "Recorded against the wrong invoice" };
  assert.equal((await request("sales", voidPath, "POST", voidInput)).status, 403);
  const firstVoid = await request("finance", voidPath, "POST", voidInput);
  assert.equal(firstVoid.status, 200);
  assert.equal((await request("finance", voidPath, "POST", voidInput)).body.id, firstVoid.body.id);
  assert.equal((await request("finance", voidPath, "POST", { operationId: randomUUID(), reason: voidInput.reason })).status, 409);
  assert.equal((await request("finance", voidPath, "POST", { ...voidInput, reason: "Changed reason" })).status, 409);
  assert.equal((await request("finance", path, "POST", { ...input, operationId: randomUUID(), reference: "T-1043" })).status, 201, "void then re-record");
  const secondDraft = await makeDraft();
  const secondPath = `/billing/${secondDraft}/external-invoice`;
  assert.equal((await request("manager", secondPath, "POST", { ...original, operationId: randomUUID(), reference: "T-2000" })).status, 201);
  assert.equal((await request("manager", `${secondPath}/void`, "POST", voidInput)).status, 409, "void operation cannot be reused on another record");

  const thirdDraft = await makeDraft();
  const thirdPath = `/billing/${thirdDraft}/external-invoice`;
  assert.equal((await request("finance", thirdPath, "POST", { ...original, operationId: randomUUID(), reference: "T-3000" })).status, 201);
  const concurrentId = randomUUID();
  const concurrent = await Promise.all([
    request("finance", `${thirdPath}/void`, "POST", { operationId: concurrentId, reason: "Duplicate" }),
    request("finance", `${thirdPath}/void`, "POST", { operationId: concurrentId, reason: "Duplicate" }),
  ]);
  assert.deepEqual(concurrent.map((result) => result.status).sort(), [200, 200]);
  assert.equal(concurrent[0].body.id, concurrent[1].body.id);
  const fourthDraft = await makeDraft();
  const fourthPath = `/billing/${fourthDraft}/external-invoice`;
  assert.equal((await request("finance", fourthPath, "POST", { ...original, operationId: randomUUID() })).status, 201);
  const competing = await Promise.all([
    request("finance", `${fourthPath}/void`, "POST", { operationId: randomUUID(), reason: "First correction" }),
    request("finance", `${fourthPath}/void`, "POST", { operationId: randomUUID(), reason: "Second correction" }),
  ]);
  assert.deepEqual(competing.map((result) => result.status).sort(), [200, 409], "different concurrent voids resolve deterministically");
  const postedDraft = await makeDraft();
  await pool.query("UPDATE billing_draft SET status='posted' WHERE id=$1", [postedDraft]);
  const postedVersion = (await pool.query("SELECT version FROM billing_draft WHERE id=$1", [postedDraft])).rows[0].version;
  assert.equal((await request("finance", `/billing/${postedDraft}/external-invoice`, "POST", { ...original, operationId: randomUUID(), expectedVersion: postedVersion })).status, 409);
  const ambiguousDraft = await makeDraft();
  await pool.query("UPDATE billing_draft SET status='failed',posting_request_id=$2 WHERE id=$1", [ambiguousDraft, randomUUID()]);
  const ambiguousVersion = (await pool.query("SELECT version FROM billing_draft WHERE id=$1", [ambiguousDraft])).rows[0].version;
  assert.equal((await request("finance", `/billing/${ambiguousDraft}/external-invoice`, "POST", { ...original, operationId: randomUUID(), expectedVersion: ambiguousVersion })).status, 409,
    "an unresolved provider posting request cannot be overwritten by an outside mark");
  const events = await pool.query("SELECT action,entity_id FROM audit_event WHERE entity_id=ANY($1) AND action LIKE 'billing.external_invoice.%'", [[draftId, secondDraft, thirdDraft]]);
  assert.equal(events.rows.filter((row) => row.entity_id === draftId && row.action === "billing.external_invoice.recorded").length, 2);
  assert.equal(events.rows.filter((row) => row.entity_id === draftId && row.action === "billing.external_invoice.voided").length, 1);
  assert.equal(events.rows.filter((row) => row.entity_id === thirdDraft && row.action === "billing.external_invoice.voided").length, 1);
});
