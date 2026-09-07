import { previewServiceAgreementActivation } from "./service-agreement.activation";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import {
  createServiceAgreement,
  editServiceAgreement,
  activateServiceAgreement,
  cancelServiceAgreement,
} from "./service-agreement.service";
import type { Actor } from "./access";
test(
  "agreement lifecycle serializes overlapping activation, preserves cancellation and rejects unapproved scope",
  { skip: !process.env.AGREEMENT_TEST_DATABASE_URL },
  async () => {
    const u = randomUUID(),
      client = randomUUID(),
      property = randomUUID(),
      recurrence = randomUUID(),
      estimate = randomUUID();
    const actor: Actor = { id: u, name: "Agreement fixture", role: "manager" };
    try {
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [u, actor.name, u + "@example.test"],
      );
      await pool.query("INSERT INTO client(id,name) VALUES($1,$2)", [
        client,
        "Agreement fixture",
      ]);
      await pool.query(
        "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,$3,$4)",
        [property, client, "Agreement property", "Synthetic"],
      );
      await pool.query(
        "INSERT INTO recurring_service(id,property_id,title,cadence,interval_count,next_date,billing_mode) VALUES($1,$2,'Visits','monthly',1,'2099-01-01','fixed_monthly')",
        [recurrence, property],
      );
      await pool.query(
        "INSERT INTO estimate(id,property_id,title,amount_cents,scope,status) VALUES($1,$2,'Approved term',10000,'Accepted service scope','approved')",
        [estimate, property],
      );
      const body = {
        id: randomUUID(),
        propertyId: property,
        recurringServiceId: recurrence,
        estimateId: estimate,
        predecessorId: null,
        terms: {
          title: "Service term",
          startsOn: "2099-01-01",
          endsOn: "2099-02-28",
          billingMode: "fixed_monthly",
          unitAmountCents: null,
          periods: [
            { startsOn: "2099-01-01", endsOn: "2099-01-31", amountCents: 4000 },
            { startsOn: "2099-02-01", endsOn: "2099-02-28", amountCents: 4000 },
          ],
        },
      };
      await assert.rejects(
        createServiceAgreement({ ...actor, role: "finance" }, body),
        /Access denied/,
      );
      const unapproved = randomUUID();
      await pool.query(
        "INSERT INTO estimate(id,property_id,title,amount_cents,scope) VALUES($1,$2,'Unapproved',10000,'Draft scope')",
        [unapproved, property],
      );
      await assert.rejects(
        createServiceAgreement(actor, {
          ...body,
          id: randomUUID(),
          estimateId: unapproved,
        }),
        /approved estimate/,
      );
      const created = await createServiceAgreement(actor, body);
      assert.equal(created.status, "draft");
      assert.deepEqual(await createServiceAgreement(actor, body), created);
      await assert.rejects(
        createServiceAgreement(actor, {
          ...body,
          terms: { ...body.terms, title: "Different" },
        }),
        /ID conflict/,
      );
      const plan = await previewServiceAgreementActivation(
        { ...actor, role: "finance" },
        body.id,
        { version: 1 },
      );
      assert.equal(plan.plannedCents, 8000);
      assert.equal(plan.billedCents, 0);
      assert.equal(plan.remainingCents, 10000);
      assert.equal(plan.periods.length, 2);
      assert.equal(plan.canActivate, true);
      assert.equal(
        (
          await pool.query("SELECT status FROM service_agreement WHERE id=$1", [
            body.id,
          ])
        ).rows[0].status,
        "draft",
      );
      const second = { ...body, id: randomUUID() };
      await createServiceAgreement(actor, second);
      const results = await Promise.allSettled([
        activateServiceAgreement(actor, body.id, { version: 1 }),
        activateServiceAgreement(actor, second.id, { version: 1 }),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const activeIndex = results.findIndex((r) => r.status === "fulfilled"),
        activeId = activeIndex === 0 ? body.id : second.id;
      await assert.rejects(
        editServiceAgreement(actor, activeId, {
          version: 2,
          terms: body.terms,
        }),
        /immutable/,
      );
      await assert.rejects(
        cancelServiceAgreement(actor, activeId, {
          version: 1,
          effectiveOn: "2099-02-01",
          reason: "Requested",
        }),
        /changed/,
      );
      const cancelled = await cancelServiceAgreement(actor, activeId, {
        version: 2,
        effectiveOn: "2099-02-01",
        reason: "Requested cancellation",
      });
      assert.equal(cancelled.status, "cancelled");
      const months = await pool.query(
        "SELECT count(*) AS n FROM fixed_charge_period WHERE agreement_id=$1 AND active=true",
        [activeId],
      );
      assert.equal(Number(months.rows[0].n), 2);
      const oldId = activeIndex === 0 ? second.id : body.id;
      const revised = {
        ...body.terms,
        startsOn: "2099-02-01",
        periods: [body.terms.periods[1]],
      };
      await editServiceAgreement(actor, oldId, { version: 1, terms: revised });
      await pool.query(
        "INSERT INTO billing_draft(id,property_id,estimate_id,title,amount_cents,kind,status) VALUES($1,$2,$3,'Prior failed deposit',7000,'deposit','failed')",
        [randomUUID(), property, estimate],
      );
      const cappedPlan = await previewServiceAgreementActivation(actor, oldId, {
        version: 2,
      });
      assert.equal(cappedPlan.billedCents, 7000);
      assert.equal(cappedPlan.remainingCents, 3000);
      assert.equal(cappedPlan.canActivate, false);
      assert.ok(
        cappedPlan.blockedReasons.some((r) => r.includes("remaining approved")),
      );
      await assert.rejects(
        activateServiceAgreement(actor, oldId, { version: 2 }),
        /remaining approved/,
      );
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT count(*) AS n FROM audit_event WHERE entity_id=$1 AND action='agreement.cancelled'",
              [activeId],
            )
          ).rows[0].n,
        ),
        1,
      );
      const emptyRecurrence = randomUUID(),
        emptyEstimate = randomUUID();
      await pool.query(
        "INSERT INTO recurring_service(id,property_id,title,cadence,interval_count,next_date,billing_mode) VALUES($1,$2,'Empty term fixture','monthly',1,'2099-01-01','fixed_monthly')",
        [emptyRecurrence, property],
      );
      await pool.query(
        "INSERT INTO estimate(id,property_id,title,amount_cents,scope,status) VALUES($1,$2,'Empty term approval',10000,'Accepted','approved')",
        [emptyEstimate, property],
      );
      const emptyId = randomUUID(),
        replacementId = randomUUID();
      const emptyBody = {
        ...body,
        id: emptyId,
        estimateId: emptyEstimate,
        recurringServiceId: emptyRecurrence,
        terms: {
          ...body.terms,
          endsOn: "2099-01-31",
          periods: [
            { startsOn: "2099-01-01", endsOn: "2099-01-31", amountCents: 1000 },
          ],
        },
      };
      await createServiceAgreement(actor, emptyBody);
      await activateServiceAgreement(actor, emptyId, { version: 1 });
      await cancelServiceAgreement(actor, emptyId, {
        version: 2,
        effectiveOn: "2099-01-01",
        reason: "Cancel before service starts",
      });
      const replacement = {
        ...emptyBody,
        id: replacementId,
        terms: {
          ...body.terms,
          startsOn: "2098-12-01",
          endsOn: "2099-02-28",
          periods: [
            { startsOn: "2098-12-01", endsOn: "2098-12-31", amountCents: 500 },
            { startsOn: "2099-01-01", endsOn: "2099-01-31", amountCents: 500 },
            { startsOn: "2099-02-01", endsOn: "2099-02-28", amountCents: 500 },
          ],
        },
      };
      await createServiceAgreement(actor, replacement);
      assert.equal(
        (await activateServiceAgreement(actor, replacementId, { version: 1 }))
          .status,
        "active",
      );
    } finally {
      await pool.end();
    }
  },
);
