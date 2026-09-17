import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
