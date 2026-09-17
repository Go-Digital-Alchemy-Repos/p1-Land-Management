import { randomUUID } from "node:crypto";
import { fixture } from "./crm-payload-fixture.mjs";
export async function setupCrmImportFixture(pool) {
  const owner = randomUUID(),
    person = randomUUID(),
    lead = randomUUID(),
    client = randomUUID(),
    instance = randomUUID(),
    submission = randomUUID();
  for (const [id, role] of [
    [owner, "owner"],
    [person, "member"],
  ]) {
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [id, "Synthetic " + role, id + "@example.test"],
    );
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,$2)", [
      id,
      role,
    ]);
  }
  await pool.query(
    "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,ARRAY['revenue.sales','customers.clients'])",
    [person],
  );
  await pool.query(
    "INSERT INTO client(id,name,email) VALUES($1,'Existing customer','existing@example.test')",
    [client],
  );
  await pool.query(
    "INSERT INTO lead(id,name,email,location,description,converted_client_id) VALUES($1,'Existing lead','existing@example.test','Existing site','Existing intake',$2)",
    [lead, client],
  );
  await pool.query(
    "INSERT INTO commercial_intake_receipt(id,source_instance_id,submission_id,event_id,schema_version,payload_sha256,accepted_at,lead_id,raw_intake) VALUES($1,$2,$3,$4,1,$5,now(),$6,'{\"original\":true}')",
    [randomUUID(), instance, submission, randomUUID(), "a".repeat(64), lead],
  );
  const input = fixture();
  input.sourceInstanceId = instance;
  input.records.leads[0].formSubmissionId = submission;
  input.targetInventory = {
    dashboardLeads: [{ id: lead, status: "new", convertedClientId: client }],
    dashboardClients: [{ id: client }],
    canonicalUsers: [{ id: person }],
    identityLinks: [
      { coreUserId: "source-user", canonicalUserId: person, revokedAt: null },
    ],
    recordLinks: [],
    receipts: [
      { sourceInstanceId: instance, submissionId: submission, leadId: lead },
    ],
  };
  input.records.leadTasks[0].completed = false;
  input.records.leadTasks[0].assignedToId = "source-user";
  return { owner, person, lead, client, instance, input };
}
