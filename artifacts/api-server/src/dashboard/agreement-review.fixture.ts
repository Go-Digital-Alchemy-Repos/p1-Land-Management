import { randomUUID } from "node:crypto";
import type { Actor } from "./access";
import { pool } from "./database";
import {
  createServiceAgreement,
  activateServiceAgreement,
  cancelServiceAgreement,
} from "./service-agreement.service";
import { prepareAgreementCharge } from "./service-agreement.billing";
export async function reviewFixture(cancelled = true) {
  if (
    !process.env.AGREEMENT_TEST_DATABASE_URL ||
    process.env.AGREEMENT_TEST_DATABASE_URL !==
      process.env.DASHBOARD_DATABASE_URL
  )
    throw Error("Review fixtures require the isolated agreement database");
  const a: Actor = {
    id: randomUUID(),
    name: "Review fixture",
    role: "manager",
  };
  const client = randomUUID(),
    property = randomUUID(),
    recurrence = randomUUID(),
    estimate = randomUUID(),
    agreementId = randomUUID();
  await pool.query(
    'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
    [a.id, a.name, a.id + "@example.test"],
  );
  await pool.query(
    "INSERT INTO staff_profile(user_id,role) VALUES($1,'manager')",
    [a.id],
  );
  await pool.query(
    "INSERT INTO client(id,name,quickbooks_id) VALUES($1,'Review fixture',$2)",
    [client, "fixture-" + client],
  );
  await pool.query(
    "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Review property','Synthetic')",
    [property, client],
  );
  const today = (
    await pool.query(
      "SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS d",
    )
  ).rows[0].d;
  await pool.query(
    "INSERT INTO recurring_service(id,property_id,title,cadence,interval_count,next_date,billing_mode,paused) VALUES($1,$2,'Review visits','monthly',1,$3,'fixed_monthly',true)",
    [recurrence, property, today],
  );
  await pool.query(
    "INSERT INTO estimate(id,property_id,title,amount_cents,scope,status) VALUES($1,$2,'Approved review scope',10000,'Accepted scope','approved')",
    [estimate, property],
  );
  await createServiceAgreement(a, {
    id: agreementId,
    propertyId: property,
    recurringServiceId: recurrence,
    estimateId: estimate,
    predecessorId: null,
    terms: {
      title: "Review term",
      startsOn: today,
      endsOn: today,
      billingMode: "fixed_monthly",
      unitAmountCents: null,
      periods: [{ startsOn: today, endsOn: today, amountCents: 1000 }],
    },
  });
  await activateServiceAgreement(a, agreementId, { version: 1 });
  const charge = await prepareAgreementCharge(a, agreementId, {
    periodStart: today,
  });
  if (cancelled)
    await cancelServiceAgreement(a, agreementId, {
      version: 2,
      effectiveOn: today,
      reason: "Synthetic cancellation",
    });
  return {
    a,
    client,
    property,
    recurrence,
    estimate,
    agreementId,
    charge,
    today,
  };
}
