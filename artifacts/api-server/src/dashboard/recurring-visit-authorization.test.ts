import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import { generateRecurring } from "./recurrence";
import { listRecurringJobs } from "./recurring-jobs";
import {
  createServiceAgreement,
  activateServiceAgreement,
} from "./service-agreement.service";
import { prepareAgreementCharge } from "./service-agreement.billing";
const enabled = !!process.env.AGREEMENT_TEST_DATABASE_URL;
after(() => pool.end());
async function fixture(
  maximumVisits: number,
  retainedLegacy = false,
  seedLegacyVisit = false,
) {
  const user = randomUUID(),
    client = randomUUID(),
    property = randomUUID(),
    estimate = randomUUID(),
    allocation = randomUUID(),
    recurrence = randomUUID(),
    agreement = randomUUID();
  const actor = {
    id: user,
    name: "Synthetic scheduler",
    role: "member" as const,
    capabilities: ["revenue.agreements" as const, "revenue.billing" as const],
  };
  await pool.query(
    'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
    [user, actor.name, `${user}@example.test`],
  );
  await pool.query(
    "INSERT INTO client(id,name) VALUES($1,'Allowance client')",
    [client],
  );
  await pool.query(
    "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Allowance property','Synthetic')",
    [property, client],
  );
  const dates = (
    await pool.query(
      "SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS today,((now() AT TIME ZONE 'America/New_York')::date+35)::text AS last",
    )
  ).rows[0];
  const config = {
    billingMode: "per_visit",
    startsOn: dates.today,
    endsOn: dates.last,
    cadence: "weekly",
    intervalCount: 1,
    localTime: "08:00",
    firstVisitOn: dates.today,
    unitAmountCents: 100,
    maximumVisits,
    periods: [],
  };
  await pool.query(
    "INSERT INTO estimate(id,property_id,title,scope,amount_cents) VALUES($1,$2,'Visit allowance','Authorized scope',$3)",
    [estimate, property, maximumVisits * 100],
  );
  await pool.query(
    "INSERT INTO estimate_allocation(id,estimate_id,basis,title,scope,amount_cents,scope_row_ids,cost_row_ids,configuration) VALUES($1,$2,'per_visit','Visits','Authorized scope',$3,$4,$5,$6)",
    [
      allocation,
      estimate,
      maximumVisits * 100,
      [randomUUID()],
      [randomUUID()],
      config,
    ],
  );
  await pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [estimate]);
  await pool.query("UPDATE estimate SET status='approved' WHERE id=$1", [
    estimate,
  ]);
  await pool.query(
    "INSERT INTO recurring_service(id,property_id,title,scope,cadence,interval_count,next_date,billing_mode,paused,estimate_id,estimate_allocation_id) VALUES($1,$2,'Visits','Unapproved operational description','weekly',1,$3,'per_visit',true,$4,$5)",
    [
      recurrence,
      property,
      dates.today,
      retainedLegacy ? null : estimate,
      retainedLegacy ? null : allocation,
    ],
  );
  if (seedLegacyVisit)
    await pool.query(
      "INSERT INTO work_order(id,property_id,recurring_service_id,occurrence_date,title) VALUES($1,$2,$3,$4,'Historical unmapped visit')",
      [randomUUID(), property, recurrence, dates.today],
    );
  await createServiceAgreement(actor, {
    id: agreement,
    propertyId: property,
    estimateId: estimate,
    recurringServiceId: recurrence,
    predecessorId: null,
    terms: {
      title: "Visit allowance",
      startsOn: dates.today,
      endsOn: dates.last,
      billingMode: "per_visit",
      unitAmountCents: 100,
      periods: [],
    },
  });
  await activateServiceAgreement(actor, agreement, { version: 1 });
  await pool.query("UPDATE recurring_service SET paused=false WHERE id=$1", [
    recurrence,
  ]);
  return { actor, property, recurrence, agreement, estimate, dates };
}
const insert =
  "INSERT INTO work_order(id,property_id,recurring_service_id,occurrence_date,title,job_kind) VALUES($1,$2,$3,$4::date+$5::integer,'Authorized visit','recurring_visit')";
test(
  "generated visits honor allowance, bind governing agreement and scope, and distinguish released from charged slots",
  { skip: !enabled },
  async () => {
    const f = await fixture(2);
    const status = async () =>
      (await listRecurringJobs()).find((row) => row.id === f.recurrence)!;
    assert.equal(
      (await status()).generation_status,
      "Authorized for next visit",
    );
    assert.equal((await status()).visits_remaining, 2);
    assert.equal("configuration" in (await status()), false);
    assert.equal("amount_cents" in (await status()), false);

    await Promise.all([generateRecurring(), generateRecurring()]);
    for (let i = 0; i < 3; i++) await generateRecurring();
    let rows = (
      await pool.query(
        "SELECT * FROM work_order WHERE recurring_service_id=$1 ORDER BY occurrence_date",
        [f.recurrence],
      )
    ).rows;
    assert.equal(rows.length, 2);
    assert.equal(
      (await status()).generation_status,
      "Visit allowance exhausted",
    );
    assert.equal((await status()).visit_allowance, 2);
    assert.equal((await status()).visits_reserved, 2);
    assert.equal((await status()).visits_remaining, 0);

    assert(
      rows.every(
        (row) =>
          row.service_agreement_id === f.agreement &&
          row.scope === "Authorized scope",
      ),
    );
    await assert.rejects(
      pool.query(insert, [
        randomUUID(),
        f.property,
        f.recurrence,
        f.dates.today,
        1,
      ]),
      /allowance/,
    );
    await pool.query("UPDATE work_order SET status='cancelled' WHERE id=$1", [
      rows[0].id,
    ]);
    assert.equal((await status()).visits_remaining, 1);
    await generateRecurring();
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM work_order WHERE recurring_service_id=$1",
          [f.recurrence],
        )
      ).rows[0].n,
      3,
    );
    await assert.rejects(
      pool.query("UPDATE work_order SET status='scheduled' WHERE id=$1", [
        rows[0].id,
      ]),
      /allowance/,
    );
    const charged = await fixture(1);
    await generateRecurring();
    const chargedWork = (
      await pool.query(
        "SELECT id FROM work_order WHERE recurring_service_id=$1",
        [charged.recurrence],
      )
    ).rows[0].id;
    await pool.query("UPDATE work_order SET status='reviewed' WHERE id=$1", [
      chargedWork,
    ]);
    await prepareAgreementCharge(charged.actor, charged.agreement, {
      workOrderId: chargedWork,
    });
    await pool.query("UPDATE work_order SET status='cancelled' WHERE id=$1", [
      chargedWork,
    ]);
    await assert.rejects(
      pool.query(insert, [
        randomUUID(),
        charged.property,
        charged.recurrence,
        charged.dates.today,
        2,
      ]),
      /allowance/,
    );
    await assert.rejects(
      pool.query(
        "UPDATE work_order SET occurrence_date=occurrence_date+1 WHERE id=$1",
        [rows[0].id],
      ),
      /provenance/,
    );
    await assert.rejects(
      pool.query(insert, [
        randomUUID(),
        f.property,
        f.recurrence,
        f.dates.last,
        1,
      ]),
      /term/,
    );
    const unlinked = randomUUID();
    await pool.query(
      "INSERT INTO work_order(id,property_id,title) VALUES($1,$2,'Unlinked job')",
      [unlinked, f.property],
    );
    await assert.rejects(
      pool.query(
        "UPDATE work_order SET recurring_service_id=$2,occurrence_date=$3 WHERE id=$1",
        [unlinked, f.recurrence, f.dates.today],
      ),
      /allowance/,
    );
    await assert.rejects(
      pool.query(
        "UPDATE work_order SET scheduled_at=($2::date+1)::timestamp AT TIME ZONE 'America/New_York' WHERE id=$1",
        [rows[0].id, f.dates.last],
      ),
      /authorized agreement term/,
    );
    const retained = await fixture(1, true);
    for (let i = 0; i < 3; i++) await generateRecurring();
    const retainedVisits = (
      await pool.query(
        "SELECT * FROM work_order WHERE recurring_service_id=$1",
        [retained.recurrence],
      )
    ).rows;
    assert.equal(retainedVisits.length, 1);
    assert.equal(retainedVisits[0].service_agreement_id, retained.agreement);
    assert.equal(retainedVisits[0].scope, "Authorized scope");
    const historical = await fixture(1, true, true);
    await generateRecurring();
    const historicalVisits = (
      await pool.query(
        "SELECT * FROM work_order WHERE recurring_service_id=$1",
        [historical.recurrence],
      )
    ).rows;
    assert.equal(
      historicalVisits.length,
      1,
      "Unmapped historical work consumes capacity until reconciled",
    );
    assert.equal(
      historicalVisits[0].service_agreement_id,
      null,
      "Do not invent historical authorization provenance",
    );
    const fresh = await fixture(2);
    await pool.query(
      "UPDATE recurring_service SET interval_count=2 WHERE id=$1",
      [fresh.recurrence],
    );
    assert.equal(
      (
        await pool.query("SELECT allocated_visit_available($1,$2) AS allowed", [
          fresh.recurrence,
          fresh.dates.today,
        ])
      ).rows[0].allowed,
      false,
    );
    await pool.query(
      "UPDATE recurring_service SET interval_count=1 WHERE id=$1",
      [fresh.recurrence],
    );
    await pool.query(
      "UPDATE service_agreement SET status='cancelled',cancellation_effective_on=starts_on,cancellation_reason='Synthetic cancellation' WHERE id=$1",
      [fresh.agreement],
    );
    await assert.rejects(
      pool.query(insert, [
        randomUUID(),
        fresh.property,
        fresh.recurrence,
        fresh.dates.today,
        0,
      ]),
      /term/,
    );
  },
);
test(
  "two database writers serialize the final authorized visit slot",
  { skip: !enabled },
  async () => {
    const f = await fixture(1),
      a = await pool.connect(),
      b = await pool.connect();
    try {
      await a.query("BEGIN");
      await b.query("BEGIN");
      await a.query(insert, [
        randomUUID(),
        f.property,
        f.recurrence,
        f.dates.today,
        0,
      ]);
      const pid = (await b.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      const pending = b
        .query(insert, [
          randomUUID(),
          f.property,
          f.recurrence,
          f.dates.today,
          1,
        ])
        .then(
          () => null,
          (error) => error,
        );
      let blocked = false;
      for (let i = 0; i < 100; i++) {
        if (
          (
            await pool.query(
              "SELECT cardinality(pg_blocking_pids($1))>0 AS blocked",
              [pid],
            )
          ).rows[0].blocked
        ) {
          blocked = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert(blocked);
      await a.query("COMMIT");
      assert.match(String(await pending), /allowance/);
      await b.query("ROLLBACK");
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM work_order WHERE service_agreement_id=$1",
            [f.agreement],
          )
        ).rows[0].n,
        1,
      );
    } finally {
      await Promise.all([a.query("ROLLBACK"), b.query("ROLLBACK")]);
      a.release();
      b.release();
    }
  },
);
