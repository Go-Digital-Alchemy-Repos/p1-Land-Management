import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { compositionPreparation } from "./composed-estimate-preparation.contract";
import { prepareCompositionDocument } from "./composed-estimate-preparation";
function fixture() {
  const scope = [randomUUID(), randomUUID(), randomUUID()];
  const draft = {
    version: 4,
    context_snapshot: { "client.name": "Synthetic Client" },
    dates: {
      startsOn: "2032-01-15",
      endsOn: "2032-01-31",
      preparedOn: "2032-01-01",
    },
    content: {
      terms: "Terms for {{client.name}}",
      scope: {
        items: scope.map((id, i) => ({
          id,
          title: `Scope ${i}`,
          description: `Service ${i}`,
        })),
        exclusions: "Excluded service",
      },
      costs: {
        items: ["one_time", "fixed_monthly", "per_visit"].map((basis) => ({
          id: randomUUID(),
          description: basis,
          quantity: 1.25,
          unitPriceCents: 101,
          unit: "unit",
          basis,
        })),
      },
      notes: {
        scope: "Shared scope note",
        cost: "Cost note",
        package: "Package note",
      },
    },
    pricing_plan: {
      schemaVersion: 1,
      sourceVersion: 4,
      allocations: [
        { basis: "one_time", scopeRowIds: [scope[0]] },
        {
          basis: "fixed_monthly",
          scopeRowIds: [scope[1]],
          periods: [
            {
              startsOn: "2032-01-15",
              endsOn: "2032-01-31",
              amountCents: 70,
              reviewReason: "Internal negotiated partial charge",
            },
          ],
        },
        { basis: "per_visit", scopeRowIds: [scope[2]], maximumVisits: 3 },
      ],
      review: { authorizedAmountCents: 1 },
    },
  };
  const input = compositionPreparation.parse({
    expectedVersion: 4,
    schedules: [
      {
        basis: "fixed_monthly",
        cadence: "weekly",
        intervalCount: 2,
        localTime: "09:30",
        firstVisitOn: "2032-01-15",
      },
      {
        basis: "per_visit",
        cadence: "monthly",
        intervalCount: 1,
        localTime: "10:45",
        firstVisitOn: "2032-01-31",
      },
    ],
  });
  return { draft, input };
}
test("preparation preserves reviewed scope and rates, separates schedules from charge allowances, and recomputes totals", () => {
  const { draft, input } = fixture(),
    before = structuredClone(draft);
  const result = prepareCompositionDocument(draft, input);
  assert.equal(result.authorizedAmountCents, 126 + 70 + 378);
  assert.equal(result.content.terms, "Terms for Synthetic Client");
  assert.equal(result.content.costs.items[2].totalCents, 126);
  assert.equal(result.allocations[0].configuration, null);
  assert.match(result.allocations[1].scope, /Scope 1/);
  assert.doesNotMatch(result.allocations[1].scope, /Scope 0|Scope 2/);
  assert.match(result.allocations[1].scope, /Shared scope note/);
  assert.match(result.allocations[1].scope, /Excluded service/);
  assert.equal(result.allocations[1].configuration?.intervalCount, 2);
  assert.equal(result.allocations[1].configuration?.unitAmountCents, null);
  assert.equal(result.allocations[2].configuration?.maximumVisits, 3);
  assert.equal(result.allocations[2].configuration?.unitAmountCents, 126);
  assert.equal(result.allocations[2].configuration?.firstVisitOn, "2032-01-31");
  assert(
    !JSON.stringify(
      result.allocations.map((row) => row.configuration),
    ).includes("Internal negotiated"),
  );
  assert.deepEqual(draft, before);
});
test("preparation requires current saved pricing and recomputes its eligibility", () => {
  const { draft, input } = fixture();
  draft.pricing_plan.sourceVersion = 3;
  assert.throws(
    () => prepareCompositionDocument(draft, input),
    /current draft/,
  );
  draft.pricing_plan.sourceVersion = 4;
  input.expectedVersion = 3;
  assert.throws(
    () => prepareCompositionDocument(draft, input),
    /current draft/,
  );
  input.expectedVersion = 4;
  draft.content.terms = "{{unknown}}";
  assert.throws(() => prepareCompositionDocument(draft, input), /placeholders/);
});
test("preparation rejects missing and out-of-term recurring schedules without silently changing them", () => {
  const { draft, input } = fixture();
  input.schedules.pop();
  assert.throws(() => prepareCompositionDocument(draft, input), /exactly one/);
  const second = fixture().input.schedules[1];
  input.schedules.push(second);
  for (const day of ["2032-01-14", "2032-02-01"]) {
    second.firstVisitOn = day;
    assert.throws(() => prepareCompositionDocument(draft, input), /within/);
  }
});
test("schedule contract rejects duplicate components, invalid times and nonfinite recurrence", () => {
  const { input } = fixture();
  assert.equal(
    compositionPreparation.safeParse({
      ...input,
      schedules: [input.schedules[0], input.schedules[0]],
    }).success,
    false,
  );
  for (const change of [
    { intervalCount: 0 },
    { intervalCount: 53 },
    { localTime: "24:00" },
    { firstVisitOn: "2032-02-30" },
  ])
    assert.equal(
      compositionPreparation.safeParse({
        ...input,
        schedules: [{ ...input.schedules[0], ...change }],
      }).success,
      false,
    );
});
