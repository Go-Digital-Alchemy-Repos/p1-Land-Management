import { listAgreementChargeQueue } from "./service-agreement.queue";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./database";
import type { Actor } from "./access";
import {
  createServiceAgreement,
  activateServiceAgreement,
  cancelServiceAgreement,
} from "./service-agreement.service";
import {
  prepareAgreementCharge,
  previewAgreementCharge,
} from "./service-agreement.billing";
import {
  readServiceAgreement,
  listServiceAgreements,
} from "./service-agreement.read";
test(
  "agreement charges are retry-safe drafts and serialize the shared approved cap",
  { skip: !process.env.AGREEMENT_TEST_DATABASE_URL },
  async () => {
    const user = randomUUID(),
      client = randomUUID(),
      property = randomUUID();
    const a: Actor = { id: user, name: "Billing fixture", role: "manager" };
    try {
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [user, a.name, user + "@example.test"],
      );
      await pool.query("INSERT INTO client(id,name) VALUES($1,$2)", [
        client,
        "Billing fixture",
      ]);
      await pool.query(
        "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,$3,$4)",
        [property, client, "Billing property", "Synthetic"],
      );
      const today = (
        await pool.query(
          "SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS d",
        )
      ).rows[0].d;
      async function estimate(cap: number) {
        const id = randomUUID();
        await pool.query(
          "INSERT INTO estimate(id,property_id,title,amount_cents,scope,status) VALUES($1,$2,'Approved', $3,'Approved fixture scope','approved')",
          [id, property, cap],
        );
        return id;
      }
      async function agreement(
        estimateId: string,
        mode: "fixed_monthly" | "per_visit",
      ) {
        const recurringServiceId = randomUUID(),
          id = randomUUID();
        await pool.query(
          "INSERT INTO recurring_service(id,property_id,title,cadence,interval_count,next_date,billing_mode,paused) VALUES($1,$2,'Fixture visits','monthly',1,$3,$4,true)",
          [recurringServiceId, property, today, mode],
        );
        await createServiceAgreement(a, {
          id,
          propertyId: property,
          recurringServiceId,
          estimateId,
          predecessorId: null,
          terms: {
            title: "Fixture agreement",
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
        await activateServiceAgreement(a, id, { version: 1 });
        return { id, recurringServiceId };
      }
      const fixed = await agreement(await estimate(1000), "fixed_monthly");
      await assert.rejects(
        prepareAgreementCharge({ ...a, role: "dispatch" }, fixed.id, {
          periodStart: today,
        }),
        /Access denied/,
      );
      const preview = await previewAgreementCharge(
        { ...a, role: "finance" },
        fixed.id,
        { periodStart: today },
      );
      assert.equal(preview.amountCents, 1000);
      assert.equal(preview.alreadyPrepared, false);
      assert.equal(preview.remainingCents, 1000);
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT count(*) AS n FROM agreement_charge WHERE agreement_id=$1",
              [fixed.id],
            )
          ).rows[0].n,
        ),
        0,
      );
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT count(*) AS n FROM audit_event WHERE entity_id=$1 AND action='agreement.charge_prepared'",
              [fixed.id],
            )
          ).rows[0].n,
        ),
        0,
      );
      const dispatch = await readServiceAgreement(
        { ...a, role: "dispatch" },
        fixed.id,
      );
      assert.equal(Object.hasOwn(dispatch, "unitAmountCents"), false);
      assert.equal(Object.hasOwn(dispatch, "periods"), false);
      assert.equal(Object.hasOwn(dispatch, "estimateId"), false);
      const listed = await listServiceAgreements(
        { ...a, role: "dispatch" },
        { propertyId: property },
      );
      assert.equal(listed.items.length, 1);
      assert.deepEqual(listed.items[0], dispatch);
      await assert.rejects(
        readServiceAgreement({ ...a, role: "client" }, fixed.id),
        /Access denied/,
      );
      await assert.rejects(
        listServiceAgreements({ ...a, role: "crew" }, { propertyId: property }),
        /Access denied/,
      );
      const [first, retry] = await Promise.all([
        prepareAgreementCharge(a, fixed.id, { periodStart: today }),
        prepareAgreementCharge({ ...a, role: "finance" }, fixed.id, {
          periodStart: today,
        }),
      ]);
      assert.deepEqual(first, retry);
      const acknowledged = await previewAgreementCharge(a, fixed.id, {
        periodStart: today,
      });
      assert.equal(acknowledged.alreadyPrepared, true);
      assert.equal(acknowledged.billingDraftId, first.billingDraftId);
      assert.equal(acknowledged.remainingCents, 0);
      const draft = (
        await pool.query(
          "SELECT status,kind,amount_cents,quickbooks_id FROM billing_draft WHERE id=$1",
          [first.billingDraftId],
        )
      ).rows[0];
      assert.equal(draft.status, "draft");
      assert.equal(draft.kind, "service");
      assert.equal(Number(draft.amount_cents), 1000);
      assert.equal(draft.quickbooks_id, null);
      await cancelServiceAgreement(a, fixed.id, {
        version: 2,
        effectiveOn: today,
        reason: "Fixture cancellation",
      });
      assert.deepEqual(
        await prepareAgreementCharge(a, fixed.id, { periodStart: today }),
        first,
      );
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT count(*) AS n FROM agreement_charge WHERE agreement_id=$1",
              [fixed.id],
            )
          ).rows[0].n,
        ),
        1,
      );
      const shared = await estimate(1500);
      const visits = [
        await agreement(shared, "per_visit"),
        await agreement(shared, "per_visit"),
      ];
      const jobs = await Promise.all(
        visits.map(async (v) => {
          const id = randomUUID();
          await pool.query(
            "INSERT INTO work_order(id,property_id,recurring_service_id,occurrence_date,title,status,scheduled_at) VALUES($1,$2,$3,$4,'Rescheduled fixture','reviewed',now()+interval '2 days')",
            [id, property, v.recurringServiceId, today],
          );
          return id;
        }),
      );
      const results = await Promise.allSettled(
        visits.map((v, i) =>
          prepareAgreementCharge(a, v.id, { workOrderId: jobs[i] }),
        ),
      );
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT sum(amount_cents) AS n FROM billing_draft WHERE estimate_id=$1",
              [shared],
            )
          ).rows[0].n,
        ),
        1000,
      );
      const winning = results.findIndex((r) => r.status === "fulfilled");
      const winningResult = results[winning];
      if (winningResult.status !== "fulfilled")
        throw Error("Expected prepared visit");
      await cancelServiceAgreement(a, visits[winning].id, {
        version: 2,
        effectiveOn: today,
        reason: "Cancel on prepared occurrence date",
      });
      assert.deepEqual(
        await prepareAgreementCharge(a, visits[winning].id, {
          workOrderId: jobs[winning],
        }),
        winningResult.value,
      );
      const replacementId = randomUUID(),
        replacementEstimate = await estimate(2000);
      await createServiceAgreement(a, {
        id: replacementId,
        propertyId: property,
        recurringServiceId: visits[winning].recurringServiceId,
        estimateId: replacementEstimate,
        predecessorId: null,
        terms: {
          title: "Replacement agreement",
          startsOn: today,
          endsOn: today,
          billingMode: "per_visit",
          unitAmountCents: 1000,
          periods: [],
        },
      });
      await activateServiceAgreement(a, replacementId, { version: 1 });
      const rebound = await Promise.allSettled([
        prepareAgreementCharge(a, visits[winning].id, {
          workOrderId: jobs[winning],
        }),
        prepareAgreementCharge(a, replacementId, {
          workOrderId: jobs[winning],
        }),
      ]);
      assert.equal(rebound[0].status, "fulfilled");
      assert.equal(rebound[1].status, "rejected");
      if (rebound[1].status === "rejected")
        assert.match(
          rebound[1].reason.message,
          /already has an agreement charge/,
        );
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT count(*) AS n FROM agreement_charge WHERE work_order_id=$1",
              [jobs[winning]],
            )
          ).rows[0].n,
        ),
        1,
      );
      const unmatchedRecurrence = randomUUID(),
        unmatchedWork = randomUUID();
      await pool.query(
        "INSERT INTO recurring_service(id,property_id,title,cadence,interval_count,next_date,billing_mode) VALUES($1,$2,'Unmatched fixture','monthly',1,$3,'per_visit')",
        [unmatchedRecurrence, property, today],
      );
      await pool.query(
        "INSERT INTO work_order(id,property_id,recurring_service_id,occurrence_date,title,status) VALUES($1,$2,$3,$4,'Unmatched reviewed work','reviewed')",
        [unmatchedWork, property, unmatchedRecurrence, today],
      );
      const queue = await listAgreementChargeQueue(
        { ...a, role: "finance" },
        {},
      );
      assert.equal(
        queue.items.filter((i) => i.workOrderId === jobs[winning]).length,
        1,
      );
      assert.ok(
        queue.items.some(
          (i) =>
            i.workOrderId === jobs[winning] &&
            i.state === "review_required" &&
            i.billingDraftId === winningResult.value.billingDraftId,
        ),
      );
      assert.ok(
        queue.items.some(
          (i) =>
            i.agreementId === fixed.id &&
            i.state === "review_required" &&
            i.billingDraftId === first.billingDraftId,
        ),
      );
      assert.ok(
        queue.items.some(
          (i) => i.workOrderId === unmatchedWork && i.state === "unmatched",
        ),
      );
      assert.ok(
        queue.items.some(
          (i) =>
            i.workOrderId ===
              jobs[results.findIndex((r) => r.status === "rejected")] &&
            i.state === "review_required" &&
            i.reason?.includes("remaining approved"),
        ),
      );
      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const page = await listAgreementChargeQueue(a, {
          limit: 1,
          ...(cursor ? { after: cursor } : {}),
        });
        seen.push(...page.items.map((i) => i.key));
        cursor = page.nextCursor;
      } while (cursor);
      assert.equal(new Set(seen).size, seen.length);
      assert.ok(seen.includes("work:" + unmatchedWork));
      await assert.rejects(
        listAgreementChargeQueue({ ...a, role: "dispatch" }, {}),
        /Access denied/,
      );
      const losing = results.findIndex((r) => r.status === "rejected");
      await pool.query("UPDATE work_order SET status='skipped' WHERE id=$1", [
        jobs[losing],
      ]);
      await assert.rejects(
        prepareAgreementCharge(a, visits[losing].id, {
          workOrderId: jobs[losing],
        }),
        /manager-reviewed/,
      );
      await assert.rejects(
        prepareAgreementCharge(a, visits[0].id, { workOrderId: randomUUID() }),
        /not part/,
      );
    } finally {
      await pool.end();
    }
  },
);
