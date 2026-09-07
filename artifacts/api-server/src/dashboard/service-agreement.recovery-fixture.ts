import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pool } from "./database";
import {
  createServiceAgreement,
  activateServiceAgreement,
  cancelServiceAgreement,
} from "./service-agreement.service";
import { prepareAgreementCharge } from "./service-agreement.billing";
import { readServiceAgreement } from "./service-agreement.read";
import { listAgreementChargeQueue } from "./service-agreement.queue";
const url = new URL(process.env.DASHBOARD_DATABASE_URL!);
assert.equal(url.hostname, "127.0.0.1");
assert.ok(["/recovery_source", "/recovery_target"].includes(url.pathname));
const context = process.env.RECOVERY_FIXTURE!;
try {
  if (process.argv[2] === "seed") {
    const actor = {
        id: randomUUID(),
        name: "Synthetic recovery manager",
        role: "manager" as const,
      },
      client = randomUUID(),
      property = randomUUID();
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [actor.id, actor.name, actor.id + "@example.test"],
    );
    await pool.query("INSERT INTO client(id,name) VALUES($1,$2)", [
      client,
      "Recovery client",
    ]);
    await pool.query(
      "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,$3,$4)",
      [property, client, "Recovery property", "Synthetic"],
    );
    const today = (
      await pool.query(
        "SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS d",
      )
    ).rows[0].d;
    const records = [];
    for (const mode of ["fixed_monthly", "per_visit"] as const) {
      const id = randomUUID(),
        recurrence = randomUUID(),
        estimate = randomUUID(),
        work = randomUUID();
      await pool.query(
        "INSERT INTO recurring_service(id,property_id,title,cadence,interval_count,next_date,billing_mode,paused) VALUES($1,$2,'Recovery visits','monthly',1,$3,$4,true)",
        [recurrence, property, today, mode],
      );
      await pool.query(
        "INSERT INTO estimate(id,property_id,title,amount_cents,scope,status) VALUES($1,$2,'Approved recovery scope',2000,'Synthetic approved work','approved')",
        [estimate, property],
      );
      await createServiceAgreement(actor, {
        id,
        propertyId: property,
        recurringServiceId: recurrence,
        estimateId: estimate,
        predecessorId: null,
        terms: {
          title: "Recovery " + mode,
          startsOn: today,
          endsOn: today,
          billingMode: mode,
          unitAmountCents: mode === "per_visit" ? 1000 : null,
          periods:
            mode === "fixed_monthly"
              ? [{ startsOn: today, endsOn: today, amountCents: 1000 }]
              : [],
        },
      });
      await activateServiceAgreement(actor, id, { version: 1 });
      if (mode === "per_visit")
        await pool.query(
          "INSERT INTO work_order(id,property_id,recurring_service_id,occurrence_date,title,status,scheduled_at) VALUES($1,$2,$3,$4,'Recovery rescheduled visit','reviewed',now()+interval '2 days')",
          [work, property, recurrence, today],
        );
      const source =
        mode === "per_visit" ? { workOrderId: work } : { periodStart: today };
      const receipt = await prepareAgreementCharge(actor, id, source);
      await cancelServiceAgreement(actor, id, {
        version: 2,
        effectiveOn: today,
        reason: "Synthetic recovery cancellation",
      });
      records.push({ id, source, receipt });
    }
    writeFileSync(context, JSON.stringify({ actor, property, records }), {
      mode: 0o600,
    });
    console.log(
      "Seeded two cancelled agreements, fixed and per-visit receipts, two drafts and history",
    );
  } else {
    const { actor, records } = JSON.parse(readFileSync(context, "utf8"));
    for (const record of records) {
      assert.deepEqual(
        await prepareAgreementCharge(actor, record.id, record.source),
        record.receipt,
      );
      const dispatch = await readServiceAgreement(
        { ...actor, role: "dispatch" },
        record.id,
      );
      assert.ok(!("periods" in dispatch));
      await assert.rejects(
        readServiceAgreement({ ...actor, role: "client" }, record.id),
        /Access denied/,
      );
    }
    const queue = await listAgreementChargeQueue(actor, {});
    assert.equal(queue.items.length, 2);
    assert.ok(
      queue.items.every(
        (i) => i.billingDraftId && i.state === "review_required",
      ),
    );
    const counts = (
      await pool.query(
        "SELECT (SELECT count(*)::int FROM agreement_charge) AS charges,(SELECT count(*)::int FROM billing_draft) AS drafts,(SELECT count(*)::int FROM billing_draft WHERE status='posted' OR quickbooks_id IS NOT NULL) AS posted",
      )
    ).rows[0];
    assert.deepEqual(counts, { charges: 2, drafts: 2, posted: 0 });
    console.log(
      "Restored source retries return original receipts; cancellation queue and role isolation preserved",
    );
  }
} finally {
  await pool.end();
}
