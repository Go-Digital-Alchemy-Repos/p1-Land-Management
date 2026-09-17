import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash, createHmac } from "node:crypto";
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
    async function draft() {
      const created = await createComposition(user, {
        operationId: randomUUID(),
        title: "Synthetic composed proposal",
        context: { clientId: client, propertyId: property },
        selection: {},
        dates: { startsOn: "2032-01-01", endsOn: "2032-01-31" },
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
                startsOn: "2032-01-01",
                endsOn: "2032-01-31",
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
  },
);
