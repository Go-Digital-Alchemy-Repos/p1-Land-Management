import {
  createServiceAgreement,
  editServiceAgreement,
  activateServiceAgreement,
} from "./service-agreement.service";
import { previewServiceAgreementActivation } from "./service-agreement.activation";
import {
  prepareAgreementCharge,
  previewAgreementCharge,
} from "./service-agreement.billing";
import type { Actor } from "./access";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";
import { estimateDocument } from "./estimate-document";
const enabled = !!process.env.DASHBOARD_TEST_ORIGIN;
after(() => pool.end());
async function fixture() {
  const client = randomUUID(),
    property = randomUUID(),
    estimate = randomUUID();
  await pool.query(
    "INSERT INTO client(id,name) VALUES($1,'Allocation fixture')",
    [client],
  );
  await pool.query(
    "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Allocation property','Synthetic address')",
    [property, client],
  );
  await pool.query(
    "INSERT INTO estimate(id,property_id,title,scope,amount_cents) VALUES($1,$2,'Allocation estimate','Combined scope',600)",
    [estimate, property],
  );
  const today = (
    await pool.query(
      "SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS today",
    )
  ).rows[0].today;
  const allocations = ["one_time", "fixed_monthly", "per_visit"].map(
    (basis, index) => ({ id: randomUUID(), basis, amount: (index + 1) * 100 }),
  );
  for (const allocation of allocations)
    await pool.query(
      "INSERT INTO estimate_allocation(id,estimate_id,basis,title,scope,amount_cents,scope_row_ids,cost_row_ids,configuration) VALUES($1,$2,$3,$3,$3,$4,$5,$6,$7)",
      [
        allocation.id,
        estimate,
        allocation.basis,
        allocation.amount,
        [randomUUID()],
        [randomUUID()],
        allocation.basis === "one_time"
          ? null
          : JSON.stringify({
              billingMode: allocation.basis,
              startsOn: today,
              endsOn: today,
              cadence: "weekly",
              intervalCount: 1,
              localTime: "08:00",
              unitAmountCents: allocation.basis === "per_visit" ? 100 : null,
              maximumVisits: allocation.basis === "per_visit" ? 3 : undefined,
              periods:
                allocation.basis === "fixed_monthly"
                  ? [{ startsOn: today, endsOn: today, amountCents: 200 }]
                  : [],
            }),
      ],
    );
  return { client, property, estimate, allocations, today };
}
async function charge(
  f: Awaited<ReturnType<typeof fixture>>,
  allocationId: string | null,
  amount: number,
) {
  const id = randomUUID();
  await pool.query(
    "INSERT INTO billing_draft(id,property_id,estimate_id,estimate_allocation_id,title,amount_cents,kind) VALUES($1,$2,$3,$4,'Allocation charge',$5,'service')",
    [id, f.property, f.estimate, allocationId, amount],
  );
  return id;
}
test(
  "issued allocations reconcile with the estimate, freeze in its document and constrain every billing writer",
  { skip: !enabled },
  async () => {
    const f = await fixture();
    await pool.query("UPDATE estimate SET amount_cents=601 WHERE id=$1", [
      f.estimate,
    ]);
    await assert.rejects(
      pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [f.estimate]),
      /amount must equal/,
    );
    assert.equal(
      (
        await pool.query("SELECT document_snapshot FROM estimate WHERE id=$1", [
          f.estimate,
        ])
      ).rows[0].document_snapshot,
      null,
    );
    await assert.rejects(
      pool.query("UPDATE estimate SET status='approved' WHERE id=$1", [
        f.estimate,
      ]),
      /must be issued/,
    );
    await pool.query(
      "UPDATE estimate SET amount_cents=600,status='sent' WHERE id=$1",
      [f.estimate],
    );
    const doc = await estimateDocument(pool, f.estimate);
    assert.equal(doc.allocations.length, 3);
    assert.equal(
      doc.allocations.reduce(
        (sum: number, row: any) => sum + Number(row.amount_cents),
        0,
      ),
      600,
    );
    assert.equal(
      doc.allocations.find((row: any) => row.basis === "per_visit").id,
      f.allocations[2].id,
    );
    await assert.rejects(
      pool.query(
        "UPDATE estimate_allocation SET amount_cents=1000 WHERE id=$1",
        [f.allocations[0].id],
      ),
      /immutable/,
    );
    await assert.rejects(
      pool.query("DELETE FROM estimate_allocation WHERE id=$1", [
        f.allocations[0].id,
      ]),
      /immutable/,
    );
    await assert.rejects(
      charge(f, f.allocations[0].id, 1),
      /approved estimate/,
    );
    await pool.query("UPDATE estimate SET status='approved' WHERE id=$1", [
      f.estimate,
    ]);
    await assert.rejects(charge(f, null, 1), /Choose an authorized/);
    await assert.rejects(charge(f, randomUUID(), 1), /does not belong/);
    const first = await charge(f, f.allocations[0].id, 90);
    await assert.rejects(
      charge(f, f.allocations[0].id, 11),
      /approved allocation/,
    );
    await assert.rejects(
      pool.query("UPDATE billing_draft SET amount_cents=101 WHERE id=$1", [
        first,
      ]),
      /approved allocation/,
    );
    await assert.rejects(
      pool.query(
        "UPDATE billing_draft SET estimate_id=NULL,estimate_allocation_id=NULL WHERE id=$1",
        [first],
      ),
      /cannot change authorization/,
    );
    await pool.query("UPDATE billing_draft SET status='failed' WHERE id=$1", [
      first,
    ]);
    await assert.rejects(
      charge(f, f.allocations[0].id, 11),
      /approved allocation/,
    );
    await charge(f, f.allocations[0].id, 10);
    await charge(f, f.allocations[1].id, 200);
    await charge(f, f.allocations[2].id, 300);
    await assert.rejects(
      charge(f, f.allocations[2].id, 1),
      /approved estimate/,
    );
    assert.equal(
      Number(
        (
          await pool.query(
            "SELECT sum(amount_cents) AS total FROM billing_draft WHERE estimate_id=$1",
            [f.estimate],
          )
        ).rows[0].total,
      ),
      600,
    );
  },
);
test(
  "recurrence allocations preserve independent identities and reject wrong parents, bases and missing selection",
  { skip: !enabled },
  async () => {
    const f = await fixture();
    await pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [
      f.estimate,
    ]);
    await pool.query("UPDATE estimate SET status='approved' WHERE id=$1", [
      f.estimate,
    ]);
    const create = (allocation: string | null, mode: string) =>
      pool.query(
        "INSERT INTO recurring_service(id,property_id,estimate_id,estimate_allocation_id,title,cadence,interval_count,next_date,billing_mode) VALUES($1,$2,$3,$4,'Allocation recurrence','weekly',1,'2032-01-01',$5)",
        [randomUUID(), f.property, f.estimate, allocation, mode],
      );
    await assert.rejects(create(null, "fixed_monthly"), /Choose an authorized/);
    await assert.rejects(
      create(f.allocations[0].id, "fixed_monthly"),
      /billing must match/,
    );
    await assert.rejects(
      create(f.allocations[1].id, "per_visit"),
      /billing must match/,
    );
    await assert.rejects(create(randomUUID(), "per_visit"), /does not belong/);
    await create(f.allocations[1].id, "fixed_monthly");
    await create(f.allocations[2].id, "per_visit");
    await assert.rejects(
      create(f.allocations[1].id, "fixed_monthly"),
      /recurring_service_allocation_once/,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS count FROM recurring_service WHERE estimate_id=$1",
          [f.estimate],
        )
      ).rows[0].count,
      2,
    );
    const work = randomUUID();
    await assert.rejects(
      pool.query(
        "INSERT INTO work_order(id,property_id,estimate_id,title) VALUES($1,$2,$3,'Missing allocation')",
        [work, f.property, f.estimate],
      ),
      /Choose an authorized/,
    );
    await pool.query(
      "INSERT INTO work_order(id,property_id,estimate_id,estimate_allocation_id,title) VALUES($1,$2,$3,$4,'Allocated job')",
      [work, f.property, f.estimate, f.allocations[0].id],
    );
    await assert.rejects(
      pool.query(
        "UPDATE work_order SET estimate_id=NULL,estimate_allocation_id=NULL WHERE id=$1",
        [work],
      ),
      /cannot change authorization/,
    );
  },
);
test(
  "simultaneous allocated charges serialize at the parent estimate and cannot overrun a component",
  { skip: !enabled },
  async () => {
    const f = await fixture();
    await pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [
      f.estimate,
    ]);
    await pool.query("UPDATE estimate SET status='approved' WHERE id=$1", [
      f.estimate,
    ]);
    const a = await pool.connect(),
      b = await pool.connect();
    try {
      await a.query("BEGIN");
      await b.query("BEGIN");
      const pid = (await b.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      await a.query(
        "INSERT INTO billing_draft(id,property_id,estimate_id,estimate_allocation_id,title,amount_cents,kind) VALUES($1,$2,$3,$4,'First concurrent',70,'service')",
        [randomUUID(), f.property, f.estimate, f.allocations[0].id],
      );
      const waiting = b
        .query(
          "INSERT INTO billing_draft(id,property_id,estimate_id,estimate_allocation_id,title,amount_cents,kind) VALUES($1,$2,$3,$4,'Second concurrent',70,'service')",
          [randomUUID(), f.property, f.estimate, f.allocations[0].id],
        )
        .then(
          () => null,
          (error: Error) => error,
        );
      let blocked = false;
      for (let i = 0; i < 50; i++) {
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
      assert.equal(blocked, true);
      await a.query("COMMIT");
      assert.match(String(await waiting), /approved allocation/);
      await b.query("ROLLBACK");
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT sum(amount_cents) AS total FROM billing_draft WHERE estimate_id=$1",
              [f.estimate],
            )
          ).rows[0].total,
        ),
        70,
      );
    } finally {
      await Promise.all([a.query("ROLLBACK"), b.query("ROLLBACK")]);
      a.release();
      b.release();
    }
  },
);

test(
  "allocated recurring agreements use their own scope, reviewed terms and charge capacity",
  { skip: !enabled },
  async () => {
    const f = await fixture(),
      uid = randomUUID(),
      recurrence = randomUUID(),
      agreement = randomUUID();
    const actor: Actor = {
      id: uid,
      name: "Allocation staff",
      role: "member",
      capabilities: ["revenue.agreements", "revenue.billing"],
    };
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [uid, actor.name, uid + "@example.test"],
    );
    await pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [
      f.estimate,
    ]);
    await pool.query("UPDATE estimate SET status='approved' WHERE id=$1", [
      f.estimate,
    ]);
    await charge(f, f.allocations[0].id, 90);
    await pool.query(
      "INSERT INTO recurring_service(id,property_id,estimate_id,estimate_allocation_id,title,cadence,interval_count,next_date,billing_mode,paused) VALUES($1,$2,$3,$4,'Monthly allocation','weekly',1,$5,'fixed_monthly',true)",
      [recurrence, f.property, f.estimate, f.allocations[1].id, f.today],
    );
    const terms = {
      title: "Reviewed monthly service",
      startsOn: f.today,
      endsOn: f.today,
      billingMode: "fixed_monthly",
      unitAmountCents: null,
      periods: [{ startsOn: f.today, endsOn: f.today, amountCents: 200 }],
    };
    const created = await createServiceAgreement(actor, {
      id: agreement,
      propertyId: f.property,
      estimateId: f.estimate,
      recurringServiceId: recurrence,
      predecessorId: null,
      terms,
    });
    assert.equal(created.scope, "fixed_monthly");
    assert.equal(
      (
        await pool.query(
          "SELECT estimate_allocation_id FROM service_agreement WHERE id=$1",
          [agreement],
        )
      ).rows[0].estimate_allocation_id,
      f.allocations[1].id,
    );
    await assert.rejects(
      editServiceAgreement(actor, agreement, {
        version: 1,
        terms: {
          ...terms,
          periods: [{ ...terms.periods[0], amountCents: 100 }],
        },
      }),
      /Terms differ/,
    );
    const activation = await previewServiceAgreementActivation(
      actor,
      agreement,
      { version: 1 },
    );
    assert.equal(
      activation.canActivate,
      true,
      JSON.stringify(activation.blockedReasons),
    );
    assert.equal(activation.approvedCents, 200);
    assert.equal(activation.billedCents, 0);
    assert.equal(activation.remainingCents, 200);
    await activateServiceAgreement(actor, agreement, { version: 1 });
    const before = await previewAgreementCharge(actor, agreement, {
      periodStart: f.today,
    });
    assert.equal(before.remainingCents, 200);
    const charged = await prepareAgreementCharge(actor, agreement, {
      periodStart: f.today,
    });
    const repeated = await prepareAgreementCharge(actor, agreement, {
      periodStart: f.today,
    });
    assert.equal(charged.id, repeated.id);
    assert.equal(charged.amountCents, 200);
    assert.equal(
      (
        await pool.query(
          "SELECT estimate_allocation_id FROM billing_draft WHERE id=$1",
          [charged.billingDraftId],
        )
      ).rows[0].estimate_allocation_id,
      f.allocations[1].id,
    );
    const after = await previewAgreementCharge(actor, agreement, {
      periodStart: f.today,
    });
    assert.equal(after.billedCents, 200);
    assert.equal(after.remainingCents, 0);
    const visitRecurrence = randomUUID(),
      visitAgreement = randomUUID(),
      work = randomUUID();
    await pool.query(
      "INSERT INTO recurring_service(id,property_id,estimate_id,estimate_allocation_id,title,cadence,interval_count,next_date,billing_mode,paused) VALUES($1,$2,$3,$4,'Visit allocation','weekly',1,$5,'per_visit',true)",
      [visitRecurrence, f.property, f.estimate, f.allocations[2].id, f.today],
    );
    const visitInput = {
      id: visitAgreement,
      propertyId: f.property,
      estimateId: f.estimate,
      recurringServiceId: visitRecurrence,
      predecessorId: null,
      terms: {
        title: "Reviewed visit",
        startsOn: f.today,
        endsOn: f.today,
        billingMode: "per_visit",
        unitAmountCents: 100,
        periods: [],
      },
    };
    await assert.rejects(
      createServiceAgreement(actor, {
        ...visitInput,
        terms: { ...visitInput.terms, unitAmountCents: 50 },
      }),
      /Terms differ/,
    );
    await createServiceAgreement(actor, visitInput);
    await activateServiceAgreement(actor, visitAgreement, { version: 1 });
    await pool.query(
      "INSERT INTO work_order(id,property_id,title,recurring_service_id,occurrence_date,status,job_kind) VALUES($1,$2,'Reviewed visit',$3,$4,'reviewed','recurring_visit')",
      [work, f.property, visitRecurrence, f.today],
    );
    const visitCharge = await prepareAgreementCharge(actor, visitAgreement, {
      workOrderId: work,
    });
    assert.equal(visitCharge.amountCents, 100);
    assert.equal(
      (
        await pool.query(
          "SELECT estimate_allocation_id FROM billing_draft WHERE id=$1",
          [visitCharge.billingDraftId],
        )
      ).rows[0].estimate_allocation_id,
      f.allocations[2].id,
    );
    const visitPreview = await previewAgreementCharge(actor, visitAgreement, {
      workOrderId: work,
    });
    assert.equal(visitPreview.approvedCents, 300);
    assert.equal(visitPreview.billedCents, 100);
    assert.equal(visitPreview.remainingCents, 200);
  },
);

test(
  "manual and phase billing require explicit allocations and retain idempotent cap enforcement",
  { skip: !enabled },
  async () => {
    const f = await fixture(),
      userId = randomUUID(),
      token = randomUUID(),
      project = randomUUID(),
      phase = randomUUID();
    await pool.query(
      `INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,'Allocation billing',$2,true)`,
      [userId, userId + "@example.test"],
    );
    await pool.query(
      "INSERT INTO staff_profile(user_id,role) VALUES($1,'member')",
      [userId],
    );
    await pool.query(
      "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
      [userId, ["revenue.billing"]],
    );
    await pool.query(
      `INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval '1 hour',$2,$3)`,
      [randomUUID(), token, userId],
    );
    await pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [
      f.estimate,
    ]);
    await pool.query("UPDATE estimate SET status='approved' WHERE id=$1", [
      f.estimate,
    ]);
    await pool.query(
      "INSERT INTO project(id,property_id,name,scope) VALUES($1,$2,'Allocation project','Scope')",
      [project, f.property],
    );
    await pool.query(
      "INSERT INTO project_phase(id,project_id,position,title,status) VALUES($1,$2,0,'Accepted allocation phase','accepted')",
      [phase, project],
    );
    const base = process.env.DASHBOARD_TEST_ORIGIN!;
    const cookie =
      "p1-dashboard.session_token=" +
      encodeURIComponent(
        token +
          "." +
          createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
            .update(token)
            .digest("base64"),
      );
    async function post(path: string, body: unknown) {
      const response = await fetch(base + "/api/v1" + path, {
        method: "POST",
        headers: { cookie, origin: base, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: (await response.json()) as any };
    }
    async function options(estimateId = f.estimate) {
      const response = await fetch(
        base + `/api/v1/estimates/${estimateId}/billing-allocations`,
        { headers: { cookie } },
      );
      return { status: response.status, body: (await response.json()) as any };
    }
    const initialOptions = await options();
    assert.equal(initialOptions.status, 200);
    assert.equal(initialOptions.body.remainingCents, 600);
    assert.equal(initialOptions.body.allocations.length, 3);
    assert.deepEqual(
      Object.keys(initialOptions.body.allocations[0]).sort(),
      [
        "approvedCents",
        "basis",
        "billedCents",
        "id",
        "remainingCents",
        "title",
      ].sort(),
    );
    const unapproved = await fixture();
    assert.equal((await options(unapproved.estimate)).status, 409);
    await pool.query(
      "UPDATE business_account_access SET capabilities=$2 WHERE user_id=$1",
      [userId, ["revenue.sales"]],
    );
    assert.equal((await options()).status, 403);
    await pool.query(
      "UPDATE business_account_access SET capabilities=$2 WHERE user_id=$1",
      [userId, ["revenue.billing"]],
    );
    const legacyEstimate = randomUUID();
    await pool.query(
      "INSERT INTO estimate(id,property_id,title,scope,amount_cents,status) VALUES($1,$2,'Legacy authorization','Scope',123,'approved')",
      [legacyEstimate, f.property],
    );
    const legacyOptions = await options(legacyEstimate);
    assert.equal(legacyOptions.status, 200);
    assert.deepEqual(legacyOptions.body.allocations, []);
    assert.equal(legacyOptions.body.remainingCents, 123);
    const request = {
      operationId: randomUUID(),
      propertyId: f.property,
      estimateId: f.estimate,
      title: "Manual allocation charge",
      amountCents: 90,
      kind: "service",
    };
    assert.equal((await post("/billing", request)).status, 409);
    const allocated = { ...request, estimateAllocationId: f.allocations[0].id };
    const first = await post("/billing", allocated);
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const updatedOptions = await options();
    assert.equal(updatedOptions.body.remainingCents, 510);
    assert.equal(
      updatedOptions.body.allocations.find(
        (row: any) => row.id === f.allocations[0].id,
      ).remainingCents,
      10,
    );

    assert.equal((await post("/billing", allocated)).body.id, first.body.id);
    assert.equal(
      (
        await post("/billing", {
          ...allocated,
          operationId: randomUUID(),
          amountCents: 11,
        })
      ).status,
      409,
    );
    const phaseRequest = {
      operationId: randomUUID(),
      expectedPhaseVersion: 1,
      estimateId: f.estimate,
      estimateAllocationId: f.allocations[0].id,
      title: "Phase allocation charge",
      amountCents: 10,
      kind: "progress",
    };
    const phasePath = `/project-phases/${phase}/billing-intents`;
    const prepared = await post(phasePath, phaseRequest);
    assert.equal(prepared.status, 201, JSON.stringify(prepared.body));
    const replay = await post(phasePath, phaseRequest);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.id, prepared.body.id);
    assert.equal(
      (
        await post(phasePath, {
          ...phaseRequest,
          operationId: randomUUID(),
          amountCents: 1,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await post(phasePath, {
          ...phaseRequest,
          operationId: randomUUID(),
          estimateAllocationId: null,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT estimate_allocation_id FROM billing_draft WHERE id=$1",
          [prepared.body.id],
        )
      ).rows[0].estimate_allocation_id,
      f.allocations[0].id,
    );
  },
);
