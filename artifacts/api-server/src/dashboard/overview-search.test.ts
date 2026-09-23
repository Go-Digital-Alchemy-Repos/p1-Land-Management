import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:")) throw new Error("Isolated local server required");
after(() => pool.end());

test("Overview priorities and search expose only records visible to each destination role", { skip: !base }, async () => {
  const headers = new Map<string, Record<string, string>>();
  const users: Record<string, string> = {};
  for (const role of ["owner", "dispatch", "sales", "client", "crew", "other-crew"]) {
    const userId = randomUUID(), token = randomUUID();
    users[role] = userId;
    await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [userId, role, `${userId}@example.test`]);
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,$2)", [userId, role === "other-crew" ? "crew" : role]);
    if (role === "dispatch" || role === "sales")
      await pool.query("INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)", [userId, role === "dispatch" ? ["operations.schedule"] : ["revenue.sales"]]);
    await pool.query('INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 hour\')', [randomUUID(), token, userId]);
    headers.set(role, { cookie: "p1-dashboard.session_token=" + encodeURIComponent(token + "." + createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64")), origin: base! });
  }
  const clientA = randomUUID(), clientB = randomUUID(), propertyA = randomUUID(), propertyB = randomUUID();
  await pool.query("INSERT INTO client(id,name) VALUES($1,'Synthetic Client A'),($2,'Synthetic Client B')", [clientA, clientB]);
  await pool.query("INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Synthetic Site A','Synthetic Road A'),($3,$4,'Synthetic Site B','Synthetic Road B')", [propertyA, clientA, propertyB, clientB]);
  await pool.query("INSERT INTO client_access(user_id,client_id) VALUES($1,$2)", [users.client, clientA]);
  const ownWork = randomUUID(), otherWork = randomUUID(), completed = randomUUID(), unassigned = randomUUID();
  await pool.query(`INSERT INTO work_order(id,property_id,title,assigned_to,status,scheduled_at)
    VALUES($1,$2,'Synthetic Own Job',$3,'scheduled',now()+interval '1 day'),
          ($4,$5,'Synthetic Other Job',$6,'scheduled',now()+interval '1 day'),
          ($7,$2,'Synthetic Finished Job',$3,'completed',now()),
          ($8,$2,'Synthetic Unassigned Job',NULL,'scheduled',((now() AT TIME ZONE 'America/New_York')::date+1)::timestamp AT TIME ZONE 'America/New_York')`,
    [ownWork, propertyA, users.crew, otherWork, propertyB, users["other-crew"], completed, unassigned]);
  const requestA = randomUUID(), requestB = randomUUID();
  await pool.query("INSERT INTO service_request(id,property_id,user_id,description,created_at) VALUES($1,$2,$3,'Synthetic request A',now()-interval '3 days'),($4,$5,$3,'Synthetic request B',now()-interval '3 days')", [requestA, propertyA, users.client, requestB, propertyB]);
  const estimate = randomUUID(), lead = randomUUID();
  await pool.query("INSERT INTO estimate(id,property_id,title,scope,amount_cents,status) VALUES($1,$2,'Synthetic Estimate','Synthetic scope',100,'sent')", [estimate, propertyA]);
  await pool.query("INSERT INTO lead(id,name,email,location,description,inquiry_type) VALUES($1,'Synthetic Lead','synthetic@example.test','Synthetic Road','Synthetic','commercial_site_assessment')", [lead]);
  const call = (role: string, path: string) => fetch(`${base}/api/v1${path}`, { headers: headers.get(role) });
  const needs = async (role: string) => {
    const response = await call(role, "/overview/needs-you");
    assert.equal(response.status, 200, `${role} overview`);
    return await response.json() as { kind: string; count: number; href: string }[];
  };
  const owner = await needs("owner"), dispatch = await needs("dispatch"), sales = await needs("sales"), client = await needs("client"), crew = await needs("crew");
  assert.ok(owner.some((item) => item.kind === "completed-work" && item.count >= 1));
  assert.ok(dispatch.some((item) => item.kind === "unassigned-work" && item.href.includes("unassigned=1")));
  assert.deepEqual(dispatch.map((item) => item.kind).filter((kind) => kind === "new-inquiries"), []);
  assert.ok(sales.some((item) => item.kind === "new-inquiries" && item.count >= 1));
  assert.deepEqual(sales.map((item) => item.kind).filter((kind) => kind === "completed-work"), []);
  assert.deepEqual(client.map((item) => item.kind), ["client-estimates"]);
  assert.deepEqual(crew, []);
  const search = async (role: string, q: string) => {
    const response = await call(role, `/search?q=${encodeURIComponent(q)}`);
    assert.equal(response.status, 200, `${role} search`);
    return await response.json() as { kind: string; id: string }[];
  };
  assert.equal((await call("crew", "/search?q=S")).status, 400);
  const crewResults = await search("crew", "Synthetic");
  assert.ok(crewResults.some((item) => item.id === ownWork));
  assert.ok(!crewResults.some((item) => item.id === otherWork || item.id === propertyB));
  const clientResults = await search("client", "Synthetic");
  assert.ok(clientResults.some((item) => item.id === propertyA || item.id === requestA));
  assert.ok(!clientResults.some((item) => item.id === propertyB || item.id === requestB || item.id === lead));
  assert.ok((await search("sales", "Synthetic")).some((item) => item.id === lead));
  assert.ok(!(await search("sales", "Synthetic")).some((item) => item.id === propertyA));
  assert.ok((await search("owner", "Synthetic")).some((item) => item.id === clientA));
});
