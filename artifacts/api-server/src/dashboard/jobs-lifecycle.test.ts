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
    await pool.query("INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)", [managerId, ["customers.requests", "revenue.sales", "revenue.agreement-templates.manage", "operations.schedule", "operations.recurring"]]);
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
    const create = async (kind: "one_time" | "recurring", title: string, requestId?: string, expired = false) => {
      const template = kind === "recurring" ? await auth("/agreement-templates", { name: `Fixture ${randomUUID()}`, body: "Immutable fixture terms" }) : null;
      assert.equal(template?.status || 201, 201);
      const body: any = { propertyId, title, scope: "Fixture scope", terms: "Client terms", kind, lineItems: [{ description: "Service", quantity: 1, unitPriceCents: 25000 }] };
      if (kind === "recurring") {
        body.agreementTemplateId = template!.body.id;
        body.recurring = { cadence: "weekly", intervalCount: 1, startsOn: "2030-01-01", endsOn: "2030-12-31", localTime: "08:00", billingMode: "per_visit", unitAmountCents: 25000, periods: [] };
      }
      const created = await auth(requestId ? `/requests/${requestId}/estimates` : "/estimates", body);
      assert.equal(created.status, 201, JSON.stringify(created.body));
      if (expired) await pool.query("UPDATE estimate SET expires_at=now()-interval '1 minute' WHERE id=$1",[created.body.id]);
      const sent = await auth(`/estimates/${created.body.id}/send`, { recipientContactIds: [contactId] });
      assert.equal(sent.status, 200, JSON.stringify(sent.body));
      const message = (await pool.query("SELECT payload FROM outbox WHERE dedup_key LIKE $1 ORDER BY created_at DESC LIMIT 1", [`estimate:${created.body.id}:%`])).rows[0];
      const token = String(message.payload.text).split("/").at(-1)!;
      return { estimateId: created.body.id as string, token };
    };

    const request = await auth("/requests", { propertyId, description: "Fixture inbound request", source: "manual" });
    assert.equal(request.status, 201);
    const oneTime = await create("one_time", "One-time fixture", request.body.id);
    const issued = await auth(`/estimates/${oneTime.estimateId}/document`);
    assert.equal(issued.body.document_snapshot_state,"frozen");
    assert.equal(issued.body.document_snapshot.schemaVersion,1);
    const originalCustomer=(await publicRequest(`/estimates/${oneTime.token}`)).body;
    await pool.query("UPDATE client SET name='Renamed client after send' WHERE id=$1",[clientId]);
    await pool.query("UPDATE property SET name='Renamed property after send',address='Changed address after send' WHERE id=$1",[propertyId]);
    const afterRename=(await publicRequest(`/estimates/${oneTime.token}`)).body;
    assert.equal(afterRename.client_name,originalCustomer.client_name);
    assert.equal(afterRename.property_name,originalCustomer.property_name);
    assert.equal(afterRename.address,originalCustomer.address);
    assert.deepEqual(afterRename.line_items,originalCustomer.line_items);
    assert.equal((await auth(`/estimates/${oneTime.estimateId}/document`)).body.address,issued.body.address);
    for(const sql of [
      "UPDATE estimate SET scope='Changed after send' WHERE id=$1",
      "UPDATE estimate SET amount_cents=999 WHERE id=$1",
      "UPDATE estimate SET document_snapshot=NULL WHERE id=$1",
      "DELETE FROM estimate WHERE id=$1",
    ])await assert.rejects(pool.query(sql,[oneTime.estimateId]),/immutable|cannot be deleted/);
    for(const sql of [
      "UPDATE estimate_line_item SET quantity=2 WHERE estimate_id=$1",
      "DELETE FROM estimate_line_item WHERE estimate_id=$1",
      "INSERT INTO estimate_line_item(id,estimate_id,position,description,quantity,unit_price_cents) VALUES(gen_random_uuid(),$1,99,'Late row',1,100)",
    ])await assert.rejects(pool.query(sql,[oneTime.estimateId]),/immutable/);
    const approval = await publicRequest(`/estimates/${oneTime.token}/decision`, { status: "approved" });
    assert.equal(approval.status, 200, JSON.stringify(approval.body));
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM work_order WHERE estimate_id=$1", [oneTime.estimateId])).rows[0].n, 1);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM service_request_conversion WHERE service_request_id=$1", [request.body.id])).rows[0].n, 1);
    assert.equal((await publicRequest(`/estimates/${oneTime.token}/decision`, { status: "approved" })).status, 404);

    const expired = await create("one_time", "Expired fixture", undefined, true);
    assert.equal((await publicRequest(`/estimates/${expired.token}`)).status, 404);

    const recurring = await create("recurring", "Recurring fixture");
    const recurringDocument = await publicRequest(`/estimates/${recurring.token}`);
    assert.equal(recurringDocument.body.agreement_template_snapshot, "Immutable fixture terms");
    assert.equal(recurringDocument.body.terms, "Client terms");
    const downloaded = await fetch(base + `/api/public/estimates/${recurring.token}/pdf`);
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.headers.get("content-type"), "application/pdf");
    assert(Buffer.from(await downloaded.arrayBuffer()).toString("latin1").startsWith("%PDF-"));
    const recurringApproval = await publicRequest(`/estimates/${recurring.token}/decision`, { status: "approved" });
    assert.equal(recurringApproval.status, 200, JSON.stringify(recurringApproval.body));
    const program = (await pool.query("SELECT r.paused,a.status,a.template_snapshot FROM recurring_service r JOIN service_agreement a ON a.id=r.agreement_id WHERE r.estimate_id=$1", [recurring.estimateId])).rows[0];
    assert.deepEqual({ paused: program.paused, status: program.status, snapshot: program.template_snapshot }, { paused: true, status: "draft", snapshot: "Immutable fixture terms" });
    assert.equal((await publicRequest(`/estimates/${recurring.token}`)).status, 404);
    const legacyId=randomUUID();
    await pool.query("INSERT INTO estimate(id,property_id,title,scope,amount_cents,status) VALUES($1,$2,'Legacy issued estimate','Retained old scope',500,'approved')",[legacyId,propertyId]);
    const legacyDocument=(await auth(`/estimates/${legacyId}/document`)).body;
    assert.equal(legacyDocument.document_snapshot,null);
    assert.equal(legacyDocument.document_snapshot_state,"legacy_live");
    assert.equal(legacyDocument.scope,"Retained old scope");
    const revisionSource = await create("one_time","Revision source");
    const priorDocument=(await auth(`/estimates/${revisionSource.estimateId}/document`)).body;
    const revisionResult=await auth(`/estimates/${revisionSource.estimateId}/revise`,{revision:1,title:"New revision",scope:"Revised scope",amountCents:25000});
    assert.equal(revisionResult.status,201,JSON.stringify(revisionResult.body));
    const nextDocument=(await auth(`/estimates/${revisionResult.body.id}/document`)).body;
    assert.equal(nextDocument.document_snapshot_state,"draft");
    assert.equal(nextDocument.document_snapshot,null);
    assert.equal(nextDocument.revision,2);
    assert.equal((await publicRequest(`/estimates/${revisionSource.token}`)).status,404);
    assert.deepEqual((await auth(`/estimates/${revisionSource.estimateId}/document`)).body.document_snapshot,priorDocument.document_snapshot);
    assert.equal((await auth(`/estimates/${revisionResult.body.id}/send`,{recipientContactIds:[contactId]})).status,200);
    assert.equal((await auth(`/estimates/${revisionResult.body.id}/document`)).body.document_snapshot.document.scope,"Revised scope");

    async function draftForRace(title:string) {
      const result=await auth("/estimates",{propertyId,title,scope:"Race scope",lineItems:[{description:"Original row",quantity:1,unitPriceCents:100}]});
      assert.equal(result.status,201);return result.body.id;
    }
    const firstRace=await draftForRace("Writer before send"), secondRace=await draftForRace("Send before writer");
    const writer=await pool.connect(),sender=await pool.connect();
    async function waitBlocked(pid:number){
      for(let attempt=0;attempt<200;attempt++){
        if((await pool.query("SELECT cardinality(pg_blocking_pids($1))>0 AS blocked",[pid])).rows[0].blocked)return;
        await new Promise(resolve=>setTimeout(resolve,10));
      }
      throw new Error("Expected the competing database write to wait on the estimate lock");
    }
    try {
      const senderPid=(await sender.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      const writerPid=(await writer.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      await writer.query("BEGIN");
      await writer.query("UPDATE estimate_line_item SET description='Committed before send' WHERE estimate_id=$1",[firstRace]);
      const waitingSend=sender.query("UPDATE estimate SET status='sent' WHERE id=$1",[firstRace]).then(()=>null,error=>error);
      await waitBlocked(senderPid);
      await writer.query("COMMIT");assert.equal(await waitingSend,null);
      assert.equal((await auth(`/estimates/${firstRace}/document`)).body.line_items[0].description,"Committed before send");
      await sender.query("BEGIN");await sender.query("UPDATE estimate SET status='sent' WHERE id=$1",[secondRace]);
      const waitingWrite=writer.query("INSERT INTO estimate_line_item(id,estimate_id,position,description,quantity,unit_price_cents) VALUES(gen_random_uuid(),$1,3,'Late insertion',1,100)",[secondRace]).then(()=>null,error=>error);
      await waitBlocked(writerPid);
      await sender.query("COMMIT");
      assert.match(String(await waitingWrite),/immutable/);
      assert.equal((await auth(`/estimates/${secondRace}/document`)).body.line_items.length,1);
    } finally {
      await Promise.all([writer.query("ROLLBACK"),sender.query("ROLLBACK")]);writer.release();sender.release();
    }
    const unsupported = await auth("/estimates", {propertyId,title:"Unsupported 🌳",scope:"Scope",lineItems:[{description:"Work",quantity:1,unitPriceCents:100}]});
    assert.equal(unsupported.status,201);
    assert.equal((await auth(`/estimates/${unsupported.body.id}/send`,{recipientContactIds:[contactId]})).status,422);
    assert.equal((await pool.query("SELECT status FROM estimate WHERE id=$1",[unsupported.body.id])).rows[0].status,"draft");
    assert.equal((await auth(`/estimates/${unsupported.body.id}/document`)).body.document_snapshot,null);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM estimate_recipient WHERE estimate_id=$1",[unsupported.body.id])).rows[0].n,0);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM outbox WHERE dedup_key LIKE $1",[`estimate:${unsupported.body.id}:%`])).rows[0].n,0);
  },
);
