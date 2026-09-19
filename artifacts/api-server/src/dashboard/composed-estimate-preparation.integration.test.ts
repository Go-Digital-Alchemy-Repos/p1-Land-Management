import { generateRecurring } from "./recurrence";
import { prepareAgreementCharge } from "./service-agreement.billing";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash, createHmac } from "node:crypto";
import { createComposedChangeOrder } from "./composed-estimate-change-order";
import { createComposedRevision } from "./composed-estimate-revision";
import { estimateDocument } from "./estimate-document";
import { composedEstimateDocument } from "./composed-estimate-document";
import { composedProposalBlocks } from "@workspace/api-zod/estimate-document";
import { estimatePdfBlocks } from "./estimate-pdf";
import { pool, transaction } from "./database";
import { prepareComposedEstimate } from "./composed-estimate-preparation.service";
import {
  createComposition,
  editComposition,
} from "./agreement-composition.service";
import { saveCompositionPricing } from "./agreement-pricing.service";
const enabled = !!process.env.COMMERCIAL_TEST_DATABASE_URL;
if (enabled) {
  // The marker enables the test; DASHBOARD_DATABASE_URL actually selects the DB.
  const databaseUrl = new URL(process.env.DASHBOARD_DATABASE_URL || "");
  const originUrl = new URL(process.env.DASHBOARD_TEST_ORIGIN || "");
  const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (!loopback.has(databaseUrl.hostname) || !loopback.has(originUrl.hostname) ||
      !/(test|fixture|acceptance)/i.test(databaseUrl.pathname)) {
    throw new Error("Composed acceptance requires a named disposable loopback database and local HTTP server");
  }
}

after(() => pool.end());
test(
  "composed preparation freezes one proposal atomically and recovers identical retries without operational effects",
  { skip: !enabled },
  async () => {
    const user = randomUUID(),
      client = randomUUID(),
      property = randomUUID();
    const actor = {
      id: user,
      name: "Synthetic Sales",
      role: "manager" as const,
      capabilities: ["revenue.sales" as const],
    };
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [user, actor.name, `${user}@example.test`],
    );
    await pool.query(
      "INSERT INTO client(id,name) VALUES($1,'Synthetic proposal client')",
      [client],
    );
    await pool.query(
      "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Synthetic property','Synthetic address')",
      [property, client],
    );
    async function draft(startsOn = "2032-01-01", endsOn = "2032-01-31") {
      const created = await createComposition(user, {
        operationId: randomUUID(),
        title: "Synthetic composed proposal",
        context: { clientId: client, propertyId: property },
        selection: {},
        dates: { startsOn, endsOn },
      });
      const ids = [randomUUID(), randomUUID(), randomUUID()];
      const edited = await editComposition(user, created.id, {
        expectedVersion: created.version,
        title: created.title,
        dates: created.dates,
        content: {
          terms: "Terms for {{client.name}}",
          scope: {
            items: ids.map((id, i) => ({
              id,
              title: `Scope ${i}`,
              description: "Agreed work",
            })),
            exclusions: "Excluded work",
          },
          costs: {
            items: ["one_time", "fixed_monthly", "per_visit"].map((basis) => ({
              id: randomUUID(),
              description: basis,
              quantity: 1,
              unitPriceCents: 100,
              unit: "unit",
              basis,
            })),
          },
          notes: {
            scope: "Scope notes",
            cost: "Cost notes",
            package: "Package notes",
          },
        },
      });
      return saveCompositionPricing(user, edited.id, {
        expectedVersion: edited.version,
        allocations: [
          { basis: "one_time", scopeRowIds: [ids[0]] },
          {
            basis: "fixed_monthly",
            scopeRowIds: [ids[1]],
            periods: [
              {
                startsOn,
                endsOn,
                amountCents: 100,
                reviewReason: "PRIVATE-PRICING-REVIEW-NOTE",
              },
            ],
          },
          { basis: "per_visit", scopeRowIds: [ids[2]], maximumVisits: 3 },
        ],
      });
    }
    for (const missingLine of [false, true]) {
      await assert.rejects(
        transaction(async (c) => {
          const key = randomUUID(),
            allocation = randomUUID(),
            scopeId = randomUUID(),
            costId = randomUUID();
          await c.query(
            "INSERT INTO estimate(id,property_id,title,scope,amount_cents,kind) VALUES($1,$2,'Incomplete allocation','Scope',100,'composed')",
            [key, property],
          );
          if (missingLine)
            await c.query(
              "INSERT INTO estimate_allocation(id,estimate_id,basis,title,scope,amount_cents,scope_row_ids,cost_row_ids) VALUES($1,$2,'one_time','One-time','Scope',100,$3,$4)",
              [allocation, key, [scopeId], [costId]],
            );
          await c.query(
            "UPDATE estimate SET composition_snapshot=$2 WHERE id=$1",
            [key, { schemaVersion: 1, content: {}, party: {} }],
          );
        }),
        missingLine ? /reviewed cost rows/ : /reconcile/,
      );
    }
    const source = await draft();
    const input = {
      expectedVersion: source.version,
      schedules: [
        {
          basis: "fixed_monthly",
          cadence: "weekly",
          intervalCount: 1,
          localTime: "09:00",
          firstVisitOn: "2032-01-01",
        },
        {
          basis: "per_visit",
          cadence: "weekly",
          intervalCount: 2,
          localTime: "10:00",
          firstVisitOn: "2032-01-02",
        },
      ],
    };
    await assert.rejects(
      prepareComposedEstimate({ ...actor, capabilities: [] }, source.id, input),
      /access|permission|allowed|capability/i,
    );
    const results = await Promise.all([
      prepareComposedEstimate(actor, source.id, input),
      prepareComposedEstimate(actor, source.id, input),
    ]);
    assert.equal(results.filter((result) => result.created).length, 1);
    assert.equal(results[0].estimateId, results[1].estimateId);
    const result = results[0];
    assert.equal(result.draft.status, "prepared");
    assert.equal(result.draft.version, source.version + 1);
    assert.equal(result.draft.pricing_plan.sourceVersion, result.draft.version);
    assert.equal("preparation_fingerprint" in result.draft, false);
    const estimate = (
      await pool.query("SELECT * FROM estimate WHERE id=$1", [
        result.estimateId,
      ])
    ).rows[0];
    assert.equal(estimate.status, "draft");
    assert.equal(estimate.kind, "composed");
    assert.equal(Number(estimate.amount_cents), 500);
    assert.equal(
      estimate.composition_snapshot.content.terms,
      "Terms for Synthetic proposal client",
    );
    assert.equal(estimate.composition_snapshot.sourceVersion, source.version);
    assert.equal(estimate.document_snapshot, null);
    const allocations = (
      await pool.query(
        "SELECT * FROM estimate_allocation WHERE estimate_id=$1 ORDER BY basis",
        [result.estimateId],
      )
    ).rows;
    assert.equal(allocations.length, 3);
    const lines = (
      await pool.query(
        "SELECT * FROM estimate_line_item WHERE estimate_id=$1 ORDER BY position",
        [result.estimateId],
      )
    ).rows;
    assert.equal(lines.length, 3);
    for (const line of lines) {
      const allocation = allocations.find(
        (row) => row.id === line.estimate_allocation_id,
      )!;
      assert.equal(allocation.basis, line.billing_basis);
      assert(allocation.cost_row_ids.includes(line.source_row_id));
      assert.equal(Number(line.unit_price_cents), 100);
    }
    for (const [sql, args] of [
      ["UPDATE estimate SET title='Changed' WHERE id=$1", [result.estimateId]],
      ["DELETE FROM estimate WHERE id=$1", [result.estimateId]],
      [
        "UPDATE estimate_line_item SET unit_price_cents=1 WHERE estimate_id=$1",
        [result.estimateId],
      ],
      [
        "DELETE FROM estimate_allocation WHERE estimate_id=$1",
        [result.estimateId],
      ],
    ] as [string, string[]][])
      await assert.rejects(
        pool.query(sql, args),
        (error: any) => error.code === "23514",
      );
    for (const table of [
      "work_order",
      "recurring_service",
      "service_agreement",
      "billing_draft",
      "estimate_recipient",
    ])
      assert.equal(
        (
          await pool.query(
            `SELECT count(*)::int AS n FROM ${table} WHERE estimate_id=$1`,
            [result.estimateId],
          )
        ).rows[0].n,
        0,
      );
    await assert.rejects(
      prepareComposedEstimate(actor, source.id, { ...input, validForDays: 10 }),
      /different proposal/,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM audit_event WHERE entity_id=$1 AND action='agreement-draft.prepared'",
          [source.id],
        )
      ).rows[0].n,
      1,
    );
    const office = await estimateDocument(pool, result.estimateId);
    const projected = composedEstimateDocument(
      estimate.composition_snapshot,
    ).document;
    assert.deepEqual(office.composition_document, projected);
    for (const change of ["missing_scope", "rate", "missing_cost", "basis"]) {
      const malformed = structuredClone(estimate.composition_snapshot);
      if (change === "missing_scope")
        malformed.allocations[0].scopeRowIds = [randomUUID()];
      if (change === "rate") malformed.allocations[0].rateCents = 1;
      if (change === "missing_cost") malformed.content.costs.items.pop();
      if (change === "basis")
        malformed.content.costs.items[0].basis = "per_visit";
      assert.throws(() => composedEstimateDocument(malformed), /needs review/);
    }
    const customerText = JSON.stringify(projected);
    assert(
      JSON.stringify(estimate.composition_snapshot).includes(
        "PRIVATE-PRICING-REVIEW-NOTE",
      ),
    );
    assert(!customerText.includes("PRIVATE-PRICING-REVIEW-NOTE"));
    for (const privateKey of [
      "sourceTemplates",
      "pricingPlan",
      "scopeRowIds",
      "costRowIds",
      "reviewReason",
      "draftId",
      "clientId",
      "propertyId",
      "preparation_fingerprint",
    ])
      assert(!customerText.includes(privateKey), privateKey);
    for (const privateId of [
      source.id,
      client,
      property,
      user,
      ...allocations.map((row) => row.id),
    ])
      assert(!customerText.includes(privateId));
    assert.deepEqual(
      projected.components.map((component) => component.authorizedAmountCents),
      [100, 100, 300],
    );
    const narrative = composedProposalBlocks(projected);
    assert.deepEqual(estimatePdfBlocks(office).slice(5), narrative);
    const text = narrative.map((block) => block.text).join("\n");
    for (const phrase of [
      "per month",
      "per visit",
      "one time",
      "Maximum authorized visits: 3",
      "Maximum authorized amount: $5.00 USD",
      "Scope notes",
      "Cost notes",
      "Package notes",
      "Excluded work",
      "America/New_York",
    ])
      assert(text.includes(phrase), phrase);
    for (const table of ["client", "property"]) {
      const key = table === "client" ? client : property;
      await pool.query(`UPDATE ${table} SET archived=true WHERE id=$1`, [key]);
      await assert.rejects(
        pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [
          result.estimateId,
        ]),
        /eligibility changed/,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT document_snapshot FROM estimate WHERE id=$1",
            [result.estimateId],
          )
        ).rows[0].document_snapshot,
        null,
      );
      await pool.query(`UPDATE ${table} SET archived=false WHERE id=$1`, [key]);
    }
    const otherClient = randomUUID();
    await pool.query(
      "INSERT INTO client(id,name) VALUES($1,'Other synthetic client')",
      [otherClient],
    );
    await pool.query("UPDATE property SET client_id=$2 WHERE id=$1", [
      property,
      otherClient,
    ]);
    await assert.rejects(
      pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [
        result.estimateId,
      ]),
      /eligibility changed/,
    );
    await pool.query("UPDATE property SET client_id=$2 WHERE id=$1", [
      property,
      client,
    ]);
    await pool.query("UPDATE client SET name='New display name' WHERE id=$1", [
      client,
    ]);
    await pool.query(
      "UPDATE property SET name='New property display' WHERE id=$1",
      [property],
    );
    await pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [
      result.estimateId,
    ]);
    const frozen = (
      await pool.query("SELECT document_snapshot FROM estimate WHERE id=$1", [
        result.estimateId,
      ])
    ).rows[0].document_snapshot.document;
    assert.equal(frozen.client_name, "Synthetic proposal client");
    assert.equal(frozen.property_name, "Synthetic property");
    assert.equal(frozen.allocations.length, 3);
    const issued = await estimateDocument(pool, result.estimateId);
    assert.deepEqual(issued.composition_document, projected);
    assert.equal(issued.client_name, "Synthetic proposal client");
    const contact = randomUUID(),
      token = randomUUID() + randomUUID();
    await pool.query(
      "INSERT INTO contact(id,client_id,name,email) VALUES($1,$2,'Synthetic recipient',$3)",
      [contact, client, `${contact}@example.test`],
    );
    await pool.query(
      "INSERT INTO estimate_recipient(id,estimate_id,contact_id,email,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6)",
      [
        randomUUID(),
        result.estimateId,
        contact,
        `${contact}@example.test`,
        createHash("sha256").update(token).digest("hex"),
        estimate.expires_at,
      ],
    );
    const response = await fetch(
      `${process.env.DASHBOARD_TEST_ORIGIN}/api/public/estimates/${token}`,
    );
    assert.equal(response.status, 200);
    const publicDoc = (await response.json()) as Record<string, unknown>;
    assert.deepEqual(publicDoc.composition_document, projected);
    assert.equal("composition_snapshot" in publicDoc, false);
    assert.equal("document_snapshot" in publicDoc, false);
    assert.equal("allocations" in publicDoc, false);
    const pdf = await fetch(
      `${process.env.DASHBOARD_TEST_ORIGIN}/api/public/estimates/${token}/pdf`,
    );
    assert.equal(pdf.status, 200);
    assert(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 5)
        .equals(Buffer.from("%PDF-")),
    );
    await pool.query(
      "UPDATE client SET name='Synthetic proposal client' WHERE id=$1",
      [client],
    );
    await pool.query(
      "UPDATE property SET name='Synthetic property' WHERE id=$1",
      [property],
    );
    const portalUser = randomUUID(),
      sessionToken = randomUUID();
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [portalUser, "Synthetic portal user", `${portalUser}@example.test`],
    );
    await pool.query(
      "INSERT INTO staff_profile(user_id,role) VALUES($1,'client')",
      [portalUser],
    );
    await pool.query(
      "INSERT INTO client_access(user_id,client_id) VALUES($1,$2)",
      [portalUser, client],
    );
    await pool.query(
      `INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval '1 hour',$2,$3)`,
      [randomUUID(), sessionToken, portalUser],
    );
    const cookie =
      "p1-dashboard.session_token=" +
      encodeURIComponent(
        sessionToken +
          "." +
          createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
            .update(sessionToken)
            .digest("base64"),
      );
    const portalDocument = () =>
      fetch(
        `${process.env.DASHBOARD_TEST_ORIGIN}/api/v1/estimates/${result.estimateId}/document`,
        { headers: { cookie } },
      );
    const ownDocument = await portalDocument();
    assert.equal(ownDocument.status, 200);
    assert.deepEqual(
      ((await ownDocument.json()) as any).composition_document,
      projected,
    );
    await pool.query("UPDATE client_access SET client_id=$2 WHERE user_id=$1", [
      portalUser,
      otherClient,
    ]);
    await pool.query("UPDATE property SET client_id=$2 WHERE id=$1", [
      property,
      otherClient,
    ]);
    assert.equal(
      (await portalDocument()).status,
      404,
      "A new property owner cannot read the original client's composed agreement",
    );
    await pool.query("UPDATE property SET client_id=$2 WHERE id=$1", [
      property,
      client,
    ]);
    const stale = await draft();
    await pool.query("UPDATE client SET name='Renamed client' WHERE id=$1", [
      client,
    ]);
    await assert.rejects(
      prepareComposedEstimate(actor, stale.id, {
        ...input,
        expectedVersion: stale.version,
      }),
      /details changed/,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT status FROM agreement_composition_draft WHERE id=$1",
          [stale.id],
        )
      ).rows[0].status,
      "draft",
    );
    await pool.query(
      "UPDATE client SET name='Synthetic proposal client' WHERE id=$1",
      [client],
    );
    const unsupported = await draft();
    await pool.query(
      "UPDATE agreement_composition_draft SET title=$2 WHERE id=$1",
      [unsupported.id, "Unsupported 🛸"],
    );
    // Title changes invalidate pricing; reprice before testing font preflight.
    const repriced = await saveCompositionPricing(user, unsupported.id, {
      expectedVersion: unsupported.version,
      allocations: unsupported.pricing_plan.allocations,
    });
    await assert.rejects(
      prepareComposedEstimate(actor, repriced.id, {
        ...input,
        expectedVersion: repriced.version,
      }),
      /PDF font/,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM estimate WHERE property_id=$1",
          [property],
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(
      pool.query(
        "INSERT INTO estimate(id,property_id,title,scope,amount_cents,kind) VALUES($1,$2,'Incomplete','Scope',100,'composed')",
        [randomUUID(), property],
      ),
      /completely prepared/,
    );
    const approve = () =>
      fetch(
        `${process.env.DASHBOARD_TEST_ORIGIN}/api/public/estimates/${token}/decision`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        },
      );
    await pool.query("UPDATE contact SET archived=true WHERE id=$1", [contact]);
    assert.equal((await approve()).status, 404);
    await pool.query("UPDATE contact SET archived=false WHERE id=$1", [
      contact,
    ]);
    await pool.query("UPDATE property SET client_id=$2 WHERE id=$1", [
      property,
      otherClient,
    ]);
    assert.equal((await approve()).status, 409);
    const wrongPortalDecision = await fetch(
      `${process.env.DASHBOARD_TEST_ORIGIN}/api/v1/estimates/${result.estimateId}/decision`,
      {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
          origin: process.env.DASHBOARD_TEST_ORIGIN!,
        },
        body: JSON.stringify({
          status: "approved",
          revision: estimate.revision,
        }),
      },
    );
    assert.equal(wrongPortalDecision.status, 409);
    await pool.query("UPDATE property SET client_id=$2 WHERE id=$1", [
      property,
      client,
    ]);
    const failureFunction = "fail_composed_" + randomUUID().replaceAll("-", "");
    await pool.query(
      `CREATE FUNCTION ${failureFunction}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='estimate.approved' AND NEW.entity_id='${result.estimateId}' THEN RAISE EXCEPTION 'Synthetic approval audit failure'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER ${failureFunction} BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION ${failureFunction}()`,
    );
    try {
      assert.equal((await approve()).status, 500);
      assert.equal(
        (
          await pool.query("SELECT status FROM estimate WHERE id=$1", [
            result.estimateId,
          ])
        ).rows[0].status,
        "sent",
      );
      for (const table of [
        "work_order",
        "recurring_service",
        "service_agreement",
        "billing_draft",
      ])
        assert.equal(
          (
            await pool.query(
              `SELECT count(*)::int AS n FROM ${table} WHERE estimate_id=$1`,
              [result.estimateId],
            )
          ).rows[0].n,
          0,
          table,
        );
      assert.equal(
        (
          await pool.query(
            "SELECT decision FROM estimate_recipient WHERE estimate_id=$1",
            [result.estimateId],
          )
        ).rows[0].decision,
        null,
      );
    } finally {
      await pool.query(`DROP TRIGGER ${failureFunction} ON audit_event`);
      await pool.query(`DROP FUNCTION ${failureFunction}()`);
    }
    const approvals = await Promise.all([approve(), approve()]);
    assert.equal(
      approvals.filter((response) => response.status === 200).length,
      1,
    );
    assert(
      approvals
        .filter((response) => response.status !== 200)
        .every((response) => [404, 409].includes(response.status)),
    );
    const receipt = (await approvals
      .find((response) => response.status === 200)!
      .json()) as any;
    assert.equal(receipt.components.length, 3);
    assert.equal((await approve()).status, 404);
    const jobs = (
      await pool.query("SELECT * FROM work_order WHERE estimate_id=$1", [
        result.estimateId,
      ])
    ).rows;
    assert.equal(jobs.length, 1);
    const oneTime = allocations.find((row) => row.basis === "one_time")!;
    assert.equal(jobs[0].estimate_allocation_id, oneTime.id);
    assert.equal(jobs[0].scope, oneTime.scope);
    assert.equal(jobs[0].scheduled_at, null);
    const recurrences = (
      await pool.query(
        "SELECT *,next_date::text AS first_date FROM recurring_service WHERE estimate_id=$1 ORDER BY billing_mode",
        [result.estimateId],
      )
    ).rows;
    const agreements = (
      await pool.query(
        "SELECT * FROM service_agreement WHERE estimate_id=$1 ORDER BY billing_mode",
        [result.estimateId],
      )
    ).rows;
    assert.equal(recurrences.length, 2);
    assert.equal(agreements.length, 2);
    for (const recurrence of recurrences) {
      const allocation = allocations.find(
        (row) => row.id === recurrence.estimate_allocation_id,
      )!;
      const agreement = agreements.find(
        (row) => row.id === recurrence.agreement_id,
      )!;
      assert.equal(recurrence.paused, true);
      assert.equal(
        recurrence.first_date,
        allocation.configuration.firstVisitOn,
      );
      assert.equal(
        recurrence.anchor_day,
        Number(allocation.configuration.firstVisitOn.slice(-2)),
      );
      assert.equal(
        recurrence.interval_count,
        allocation.configuration.intervalCount,
      );
      assert.equal(recurrence.scope, allocation.scope);
      assert.equal(agreement.status, "draft");
      assert.equal(agreement.estimate_allocation_id, allocation.id);
      assert.equal(agreement.scope_snapshot, allocation.scope);
      assert.equal(agreement.template_snapshot, projected.terms);
      assert.equal(agreement.accepted_by_contact_id, contact);
      assert(agreement.accepted_at);
      const periods = (
        await pool.query(
          "SELECT starts_on::text AS starts_on,ends_on::text AS ends_on,amount_cents FROM fixed_charge_period WHERE agreement_id=$1",
          [agreement.id],
        )
      ).rows;
      assert.equal(
        periods.length,
        allocation.basis === "fixed_monthly" ? 1 : 0,
      );
      if (periods.length) assert.equal(Number(periods[0].amount_cents), 100);
    }
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM billing_draft WHERE estimate_id=$1",
          [result.estimateId],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM audit_event WHERE entity_id=$1 AND action='estimate.approved'",
          [result.estimateId],
        )
      ).rows[0].n,
      1,
    );
    // Exercise the real Operations handoff against the approved components.
    // It must validate submitted choices, not only the pre-update schedule.
    const operationsToken = randomUUID();
    await pool.query(
      "INSERT INTO staff_profile(user_id,role) VALUES($1,'manager')",
      [user],
    );
    await pool.query(
      "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
      [user, ["operations.recurring"]],
    );
    await pool.query(
      `INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval '1 hour',$2,$3)`,
      [randomUUID(), operationsToken, user],
    );
    const operationsCookie =
      "p1-dashboard.session_token=" +
      encodeURIComponent(
        operationsToken +
          "." +
          createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
            .update(operationsToken)
            .digest("base64"),
      );
    for (const recurrence of recurrences) {
      const allocation = allocations.find(
        (row) => row.id === recurrence.estimate_allocation_id,
      )!;
      const activate = (overrides = {}) =>
        fetch(
          `${process.env.DASHBOARD_TEST_ORIGIN}/api/v1/recurring-jobs/${recurrence.id}/activate`,
          {
            method: "POST",
            headers: {
              cookie: operationsCookie,
              origin: process.env.DASHBOARD_TEST_ORIGIN!,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              assignedTo: user,
              nextDate: allocation.configuration.firstVisitOn,
              localTime: allocation.configuration.localTime,
              ...overrides,
            }),
          },
        );
      for (const mismatch of [
        { localTime: "23:59" },
        { nextDate: "2032-01-03" },
        { nextDate: "2032-02-01" },
      ]) {
        const denied = await activate(mismatch);
        assert.equal(denied.status, 409, await denied.text());
        const unchanged = (
          await pool.query(
            "SELECT r.paused,a.status FROM recurring_service r JOIN service_agreement a ON a.id=r.agreement_id WHERE r.id=$1",
            [recurrence.id],
          )
        ).rows[0];
        assert.equal(unchanged.paused, true);
        assert.equal(unchanged.status, "draft");
      }
      const activated = await activate();
      assert.equal(activated.status, 200, await activated.text());
      const saved = (
        await pool.query(
          "SELECT r.paused,r.assigned_to,r.next_date::text,r.local_time::text,a.status FROM recurring_service r JOIN service_agreement a ON a.id=r.agreement_id WHERE r.id=$1",
          [recurrence.id],
        )
      ).rows[0];
      assert.equal(saved.paused, false);
      assert.equal(saved.status, "active");
      assert.equal(saved.assigned_to, user);
      assert.equal(saved.next_date, allocation.configuration.firstVisitOn);
      assert.equal(
        saved.local_time.slice(0, 5),
        allocation.configuration.localTime,
      );
      assert.equal((await activate()).status, 409);
    }
    // Rehearse the mixed proposal handoff using today's finite one-day term.
    // No provider worker runs; sending creates only a synthetic outbox entry.
    const today = (
      await pool.query(
        "SELECT (now() AT TIME ZONE 'America/New_York')::date::text AS d",
      )
    ).rows[0].d;
    await pool.query(
      "UPDATE business_account_access SET capabilities=$2 WHERE user_id=$1",
      [user, ["operations.recurring", "operations.schedule", "revenue.sales"]],
    );
    const callStaff = async (path: string, body: unknown, cookie = operationsCookie) => {
      const response = await fetch(
        `${process.env.DASHBOARD_TEST_ORIGIN}/api/v1${path}`,
        {
          method: "POST",
          headers: {
            cookie,
            origin: process.env.DASHBOARD_TEST_ORIGIN!,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      const result = (await response.json()) as any;
      assert(response.ok, JSON.stringify(result));
      return result;
    };
    // A distinct crew identity exercises assignment and office-review boundaries.
    const crewId = randomUUID(), crewToken = randomUUID();
    await pool.query(
      `INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,'Synthetic Crew',$2,true)`,
      [crewId, `${crewId}@example.test`],
    );
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,'crew')", [crewId]);
    await pool.query(
      `INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval '1 hour',$2,$3)`,
      [randomUUID(), crewToken, crewId],
    );
    const crewCookie = "p1-dashboard.session_token=" + encodeURIComponent(
      crewToken + "." + createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(crewToken).digest("base64"),
    );
    const liveDraft = await draft(today, today);
    const livePrepared = await callStaff(
      `/agreement-drafts/${liveDraft.id}/prepare`,
      {
        expectedVersion: liveDraft.version,
        schedules: ["fixed_monthly", "per_visit"].map((basis) => ({
          basis,
          cadence: "weekly",
          intervalCount: 1,
          localTime: "08:00",
          firstVisitOn: today,
        })),
      },
    );
    await callStaff(`/estimates/${livePrepared.estimateId}/send`, {
      recipientContactIds: [contact],
    });
    const mail = (
      await pool.query("SELECT payload FROM outbox WHERE dedup_key=$1", [
        `estimate:${livePrepared.estimateId}:${contact}:v1`,
      ])
    ).rows[0];
    const approvalToken = mail.payload.text.split("/estimate-approval/")[1];
    assert(approvalToken);
    const accepted = await fetch(
      `${process.env.DASHBOARD_TEST_ORIGIN}/api/public/estimates/${approvalToken}/decision`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      },
    );
    assert.equal(accepted.status, 200, await accepted.text());
    const liveRecurrences = (
      await pool.query(
        "SELECT id,agreement_id,billing_mode FROM recurring_service WHERE estimate_id=$1",
        [livePrepared.estimateId],
      )
    ).rows;
    assert.equal(liveRecurrences.length, 2);
    for (const recurrence of liveRecurrences)
      await callStaff(`/recurring-jobs/${recurrence.id}/activate`, {
        assignedTo: crewId,
        nextDate: today,
        localTime: "08:00",
      });
    await generateRecurring();
    const liveJobs = (
      await pool.query(
        "SELECT w.* FROM work_order w JOIN recurring_service r ON r.id=w.recurring_service_id WHERE r.estimate_id=$1",
        [livePrepared.estimateId],
      )
    ).rows;
    assert.equal(liveJobs.length, 2);
    const billingActor = {
      ...actor,
      capabilities: ["revenue.billing" as const],
    };
    for (const recurrence of liveRecurrences) {
      const work = liveJobs.find(
        (row) => row.recurring_service_id === recurrence.id,
      )!;
      assert.equal(work.service_agreement_id, recurrence.agreement_id);
      const source =
        recurrence.billing_mode === "fixed_monthly"
          ? { periodStart: today }
          : { workOrderId: work.id };
      if (recurrence.billing_mode === "per_visit") {
        await assert.rejects(
          prepareAgreementCharge(billingActor, recurrence.agreement_id, source),
          /manager-reviewed/,
        );
        await callStaff(`/work-orders/${work.id}/status`, {
          status: "scheduled", version: work.version,
        });
        const capturedAt = new Date().toISOString();
        const events = [
          { id: randomUUID(), workOrderId: work.id, baseVersion: work.version + 1,
            kind: "time", payload: { action: "start" }, capturedAt },
          { id: randomUUID(), workOrderId: work.id, baseVersion: work.version + 1,
            kind: "complete", payload: { text: "Synthetic recurring visit completed offline" }, capturedAt },
        ];
        const synchronized = await callStaff("/field/sync", { events }, crewCookie);
        assert.deepEqual(synchronized.results.map((row: any) => row.status), ["accepted", "accepted"]);
        // Retrying the same offline batch is an actual HTTP replay, not a SQL simulation.
        assert.deepEqual(await callStaff("/field/sync", { events }, crewCookie), synchronized);
        const completed = (await pool.query("SELECT status,version FROM work_order WHERE id=$1", [work.id])).rows[0];
        assert.equal(completed.status, "completed");
        assert.equal((await pool.query("SELECT count(*)::int AS n FROM field_event WHERE work_order_id=$1", [work.id])).rows[0].n, 2);
        await assert.rejects(prepareAgreementCharge(billingActor, recurrence.agreement_id, source), /manager-reviewed/);
        const crewReview = await fetch(`${process.env.DASHBOARD_TEST_ORIGIN}/api/v1/work-orders/${work.id}/status`, {
          method: "POST", headers: { cookie: crewCookie, origin: process.env.DASHBOARD_TEST_ORIGIN!, "content-type": "application/json" },
          body: JSON.stringify({ status: "reviewed", version: completed.version }),
        });
        assert.equal(crewReview.status, 403, await crewReview.text());
        await callStaff(`/work-orders/${work.id}/status`, { status: "reviewed", version: completed.version });
        assert.equal((await pool.query("SELECT status FROM work_order WHERE id=$1", [work.id])).rows[0].status, "reviewed");
      }
      const charge = await prepareAgreementCharge(
        billingActor,
        recurrence.agreement_id,
        source,
      );
      assert.deepEqual(
        await prepareAgreementCharge(
          billingActor,
          recurrence.agreement_id,
          source,
        ),
        charge,
      );
    }
    const billed = (
      await pool.query(
        "SELECT b.amount_cents,b.estimate_allocation_id,a.basis FROM billing_draft b JOIN estimate_allocation a ON a.id=b.estimate_allocation_id WHERE b.estimate_id=$1 ORDER BY a.basis",
        [livePrepared.estimateId],
      )
    ).rows;
    assert.equal(billed.length, 2);
    assert.deepEqual(
      billed.map((row) => row.basis),
      ["fixed_monthly", "per_visit"],
    );
    assert(billed.every((row) => Number(row.amount_cents) === 100));
    await generateRecurring();
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM work_order w JOIN recurring_service r ON r.id=w.recurring_service_id WHERE r.estimate_id=$1",
          [livePrepared.estimateId],
        )
      ).rows[0].n,
      2,
      "No generation beyond finite one-day term",
    );
    const changeInput = {
      operationId: randomUUID(),
      expectedRevision: 1,
      title: "Additional cleanup",
    };
    const changes = await Promise.all([
      createComposedChangeOrder(actor, result.estimateId, changeInput),
      createComposedChangeOrder(actor, result.estimateId, changeInput),
    ]);
    assert.equal(changes.filter((row) => row.created).length, 1);
    assert.equal(changes[0].draft.id, changes[1].draft.id);
    const change = changes[0].draft;
    assert.equal(change.content.scope.items.length, 0);
    assert.equal(change.content.costs.items.length, 0);
    assert.equal(change.content.terms, "Terms for {{client.name}}");
    assert.equal(change.pricing_plan, null);
    assert.deepEqual(change.dates, {
      preparedOn: null,
      startsOn: null,
      endsOn: null,
    });
    await assert.rejects(
      createComposedChangeOrder(actor, result.estimateId, {
        ...changeInput,
        operationId: randomUUID(),
        expectedRevision: 2,
      }),
      /current approved/,
    );
    await assert.rejects(
      prepareComposedEstimate(actor, change.id, {
        expectedVersion: 1,
        schedules: [],
      }),
      /pricing review/,
    );
    const changeScope = randomUUID();
    const changeEdited = await editComposition(user, change.id, {
      expectedVersion: 1,
      title: change.title,
      dates: change.dates,
      content: {
        ...change.content,
        scope: {
          items: [
            {
              id: changeScope,
              title: "New cleanup area",
              description: "Additional work only",
            },
          ],
          exclusions: "",
        },
        costs: {
          items: [
            {
              id: randomUUID(),
              description: "Additional cleanup",
              quantity: 1,
              unit: "job",
              unitPriceCents: 300,
              basis: "one_time",
            },
          ],
        },
      },
    });
    const changePriced = await saveCompositionPricing(user, change.id, {
      expectedVersion: changeEdited.version,
      allocations: [{ basis: "one_time", scopeRowIds: [changeScope] }],
    });
    const changePrepared = await prepareComposedEstimate(actor, change.id, {
      expectedVersion: changePriced.version,
      schedules: [],
    });
    const extra = (
      await pool.query("SELECT * FROM estimate WHERE id=$1", [
        changePrepared.estimateId,
      ])
    ).rows[0];
    assert.equal(extra.change_order_for, result.estimateId);
    assert.equal(extra.revision, 1);
    assert.notEqual(extra.series_id, estimate.series_id);
    assert.equal(Number(extra.amount_cents), 300);
    const baseAfterChange = (
      await pool.query(
        "SELECT status,is_current,amount_cents FROM estimate WHERE id=$1",
        [result.estimateId],
      )
    ).rows[0];
    assert.deepEqual(baseAfterChange, {
      status: "approved",
      is_current: true,
      amount_cents: "500",
    });
    const extraDoc = await estimateDocument(pool, extra.id);
    assert.deepEqual(extraDoc.composition_document.changeOrder, {
      title: estimate.title,
      revision: 1,
    });
    assert(
      composedProposalBlocks(extraDoc.composition_document).some(
        (block) =>
          block.text === `Additional work for ${estimate.title}, revision 1`,
      ),
    );
    assert(
      !JSON.stringify(extraDoc.composition_document).includes(
        result.estimateId,
      ),
    );
    await pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [
      extra.id,
    ]);
    const extraToken = randomUUID() + randomUUID();
    await pool.query(
      "INSERT INTO estimate_recipient(id,estimate_id,contact_id,email,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '1 day')",
      [
        randomUUID(),
        extra.id,
        contact,
        `${contact}@example.test`,
        createHash("sha256").update(extraToken).digest("hex"),
      ],
    );
    const extraDecision = await fetch(
      `${process.env.DASHBOARD_TEST_ORIGIN}/api/public/estimates/${extraToken}/decision`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      },
    );
    assert.equal(extraDecision.status, 200);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM work_order WHERE estimate_id=$1",
          [extra.id],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM work_order WHERE estimate_id=$1",
          [result.estimateId],
        )
      ).rows[0].n,
      1,
    );
    for (const bases of [["one_time"], ["fixed_monthly", "per_visit"]]) {
      const original = await draft();
      const plans = original.pricing_plan.allocations.filter((row: any) =>
        bases.includes(row.basis),
      );
      const scopeIds = new Set(plans.flatMap((row: any) => row.scopeRowIds));
      const content = structuredClone(original.content);
      content.costs.items = content.costs.items.filter((row: any) =>
        bases.includes(row.basis),
      );
      content.scope.items = content.scope.items.filter((row: any) =>
        scopeIds.has(row.id),
      );
      const edited = await editComposition(user, original.id, {
        expectedVersion: original.version,
        title: original.title,
        dates: original.dates,
        content,
      });
      const priced = await saveCompositionPricing(user, original.id, {
        expectedVersion: edited.version,
        allocations: plans,
      });
      let prepared = await prepareComposedEstimate(actor, original.id, {
        expectedVersion: priced.version,
        schedules: input.schedules.filter((row) => bases.includes(row.basis)),
      });
      if (bases.length === 1) {
        const originalId = prepared.estimateId;
        const originalEstimate = (
          await pool.query("SELECT * FROM estimate WHERE id=$1", [originalId])
        ).rows[0];
        const request = { operationId: randomUUID(), expectedRevision: 1 };
        const revisions = await Promise.all([
          createComposedRevision(actor, originalId, request),
          createComposedRevision(actor, originalId, request),
        ]);
        assert.equal(revisions.filter((row) => row.created).length, 1);
        assert.equal(revisions[0].draft.id, revisions[1].draft.id);
        assert.equal(revisions[0].draft.pricing_plan, null);
        for (const section of ["scope", "costs"]) {
          const previousIds = new Set(
            originalEstimate.composition_snapshot.content[section].items.map(
              (row: any) => row.id,
            ),
          );
          assert(
            revisions[0].draft.content[section].items.every(
              (row: any) => !previousIds.has(row.id),
            ),
          );
        }

        assert.equal(
          revisions[0].draft.content.terms,
          "Terms for {{client.name}}",
        );
        assert.equal(
          (
            await pool.query("SELECT is_current FROM estimate WHERE id=$1", [
              originalId,
            ])
          ).rows[0].is_current,
          true,
        );
        await assert.rejects(
          prepareComposedEstimate(actor, revisions[0].draft.id, {
            expectedVersion: 1,
            schedules: [],
          }),
          /pricing review/,
        );
        const competing = await createComposedRevision(actor, originalId, {
          ...request,
          operationId: randomUUID(),
        });
        const ready = [];
        for (const revision of [revisions[0], competing])
          ready.push(
            await saveCompositionPricing(user, revision.draft.id, {
              expectedVersion: revision.draft.version,
              allocations: [
                {
                  basis: "one_time",
                  scopeRowIds: revision.draft.content.scope.items.map(
                    (row: any) => row.id,
                  ),
                },
              ],
            }),
          );
        const replacements = await Promise.allSettled(
          ready.map((draft) =>
            prepareComposedEstimate(actor, draft.id, {
              expectedVersion: draft.version,
              schedules: [],
            }),
          ),
        );
        const winners = replacements.filter(
          (result) => result.status === "fulfilled",
        );
        assert.equal(winners.length, 1);
        const loser = replacements.find(
          (result) => result.status === "rejected",
        );
        assert(loser?.status === "rejected" && loser.reason.status === 409);
        prepared =
          winners[0].status === "fulfilled" ? winners[0].value : prepared;
        const replacement = (
          await pool.query("SELECT * FROM estimate WHERE id=$1", [
            prepared.estimateId,
          ])
        ).rows[0];
        assert.equal(replacement.revision, 2);
        assert.equal(replacement.series_id, originalEstimate.series_id);
        assert.equal(
          (
            await pool.query("SELECT is_current FROM estimate WHERE id=$1", [
              originalId,
            ])
          ).rows[0].is_current,
          false,
        );
        assert.deepEqual(
          (
            await pool.query(
              "SELECT composition_snapshot FROM estimate WHERE id=$1",
              [originalId],
            )
          ).rows[0].composition_snapshot,
          originalEstimate.composition_snapshot,
        );
      }
      await pool.query("UPDATE estimate SET status='sent' WHERE id=$1", [
        prepared.estimateId,
      ]);
      const decisionToken = randomUUID() + randomUUID();
      await pool.query(
        "INSERT INTO estimate_recipient(id,estimate_id,contact_id,email,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '1 day')",
        [
          randomUUID(),
          prepared.estimateId,
          contact,
          `${contact}@example.test`,
          createHash("sha256").update(decisionToken).digest("hex"),
        ],
      );
      const decision = await fetch(
        `${process.env.DASHBOARD_TEST_ORIGIN}/api/public/estimates/${decisionToken}/decision`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        },
      );
      assert.equal(
        decision.status,
        200,
        JSON.stringify(await decision.clone().json()),
      );
      const receipt = (await decision.json()) as any;
      await assert.rejects(
        createComposedRevision(actor, prepared.estimateId, {
          operationId: randomUUID(),
          expectedRevision: bases.length === 1 ? 2 : 1,
        }),
        /change order/,
      );
      assert.equal(receipt.components.length, bases.length);
      assert.equal(receipt.recurring, !bases.includes("one_time"));
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM work_order WHERE estimate_id=$1",
            [prepared.estimateId],
          )
        ).rows[0].n,
        bases.includes("one_time") ? 1 : 0,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM recurring_service WHERE estimate_id=$1",
            [prepared.estimateId],
          )
        ).rows[0].n,
        bases.includes("one_time") ? 0 : 2,
      );
    }
  },
);
