import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import { getLeadDetails, updateLeadDetails } from "./lead-details.service";
const enabled = process.env.P1_SUBMITTED_CONTEXT_TEST === "true";
if (enabled) {
  const url = new URL(process.env.DASHBOARD_DATABASE_URL!);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/p1_context_test")
    throw Error("Dedicated disposable database required");
}
after(() => pool.end());
test("general inquiries expose preserved project context without making it writable or changing history", { skip: !enabled }, async () => {
  const id = randomUUID(), actor = randomUUID();
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,\'Synthetic owner\',$2,true)', [actor, actor + "@example.test"]);
  const context = { contact_title: "Facilities manager", reported_property_name: "Test campus", property_type: "industrial", acreage_description: "45 acres", project_stage: "operational", service_timing: "recurring", services: ["Drainage", "Vegetation"] };
  await pool.query(`INSERT INTO lead(id,name,location,description,contact_title,reported_property_name,property_type,acreage_description,project_stage,service_timing,services,attribution) VALUES($1,'Test inquiry','Test address','Test scope',$2,$3,$4,$5,$6,$7,$8,'{"private":"not exposed"}')`, [id, ...Object.values(context)]);
  const first = await getLeadDetails(id);
  assert.deepEqual(first.submittedContext, context);
  assert.equal("attribution" in first, false);
  assert.equal("private" in first.submittedContext, false);
  const correction = { expectedVersion: first.version, name: "Corrected contact", email: null, phone: null, location: "Corrected address", description: "Corrected scope", reported_company_name: "Test company" };
  await assert.rejects(updateLeadDetails(id, actor, { ...correction, submittedContext: context }));
  const saved = await updateLeadDetails(id, actor, correction);
  assert.deepEqual(saved.submittedContext, context);
  assert.equal(saved.version, first.version + 1);
  const noop = await updateLeadDetails(id, actor, { ...correction, expectedVersion: saved.version });
  assert.deepEqual(noop.submittedContext, context);
  assert.equal(noop.version, saved.version);
  await assert.rejects(updateLeadDetails(id, actor, correction), /changed/);
  const rows = (await pool.query('SELECT fields FROM lead_detail_revision WHERE lead_id=$1 ORDER BY version', [id])).rows;
  assert.equal(rows.length, 2);
  assert(rows.every(row => !("submittedContext" in row.fields)));
  assert.equal(rows[0].fields.name, "Test inquiry");
  assert.equal(rows[1].fields.name, "Corrected contact");
});
