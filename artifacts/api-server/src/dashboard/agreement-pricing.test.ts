import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  compositionContent,
  compositionDates,
} from "./agreement-composition.contract";
import {
  agreementPricingReview,
  reviewAgreementPricing,
} from "./agreement-pricing.contract";
function fixture() {
  const scopes = [randomUUID(), randomUUID(), randomUUID()];
  const content = compositionContent.parse({
    terms: "Standard terms for {{client.name}}",
    scope: {
      items: scopes.map((id, i) => ({
        id,
        title: `Scope ${i}`,
        description: "Service",
      })),
      exclusions: "Excluded work",
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
    notes: { scope: "", cost: "", package: "" },
  });
  const dates = compositionDates.parse({
    startsOn: "2032-01-01",
    endsOn: "2032-02-29",
  });
  const input = agreementPricingReview.parse({
    expectedVersion: 7,
    allocations: [
      { basis: "one_time", scopeRowIds: [scopes[0]] },
      {
        basis: "fixed_monthly",
        scopeRowIds: [scopes[1]],
        periods: [
          { startsOn: "2032-01-01", endsOn: "2032-01-31", amountCents: 126 },
          { startsOn: "2032-02-01", endsOn: "2032-02-29", amountCents: 126 },
        ],
      },
      { basis: "per_visit", scopeRowIds: [scopes[2]], maximumVisits: 8 },
    ],
  });
  const review = () =>
    reviewAgreementPricing(content, { "client.name": "Client" }, dates, input);
  return { scopes, content, dates, input, review };
}
test("mixed pricing adds finite authorized charges rather than unlike rates and preserves source rows", () => {
  const f = fixture(),
    before = structuredClone(f.content);
  const review = f.review();
  assert.equal(review.pricingValid, true);
  assert.equal(review.authorizedAmountCents, 126 + 252 + 1008);
  assert.deepEqual(
    review.allocations.map((row) => row.rateCents),
    [126, 126, 126],
  );
  assert.deepEqual(
    review.allocations.map((row) => row.authorizedAmountCents),
    [126, 252, 1008],
  );
  assert.deepEqual(review.allocations[2].costRowIds, [
    f.content.costs.items[2].id,
  ]);
  assert.equal(review.sourceVersion, 7);
  assert.deepEqual(f.content, before);
});
test("partial and exceptional monthly amounts require an explicit review and exact calendar coverage", () => {
  const f = fixture();
  f.dates.startsOn = "2032-01-15";
  const monthly = f.input.allocations[1];
  assert.equal(monthly.basis, "fixed_monthly");
  if (monthly.basis !== "fixed_monthly") return;
  monthly.periods[0].startsOn = f.dates.startsOn;
  monthly.periods[0].amountCents = 50;
  assert(f.review().blockers.some((b) => b.code === "period_review_required"));
  monthly.periods[0].reviewReason =
    "Reviewed partial first month: fixed $0.50 charge.";
  assert.equal(f.review().pricingValid, true);
  monthly.periods[1].amountCents = 200;
  assert(f.review().blockers.some((b) => b.code === "period_review_required"));
  monthly.periods[1].reviewReason = "Additional February service included.";
  assert.equal(f.review().pricingValid, true);
  monthly.periods[1].endsOn = "2032-02-28";
  assert(f.review().blockers.some((b) => b.code === "invalid_term"));
  assert.equal(f.review().authorizedAmountCents, null);
});
test("review blocks missing allocations, dropped scope, stale row identities and unresolved content", () => {
  const f = fixture();
  f.input.allocations.pop();
  let review = f.review();
  assert(review.blockers.some((b) => b.code === "missing_allocation"));
  assert.deepEqual(review.unallocatedScopeRowIds, [f.scopes[2]]);
  f.input.allocations[0].scopeRowIds = [randomUUID(), f.scopes[1], f.scopes[2]];
  f.content.terms = "{{missing}}";
  review = f.review();
  assert(review.blockers.some((b) => b.code === "unknown_scope"));
  assert(review.blockers.some((b) => b.code === "unresolved_placeholders"));
  assert.equal(review.authorizedAmountCents, null);
});
test("scope sharing is explicit, recurring terms are finite, and irrelevant allocations are rejected", () => {
  const f = fixture();
  f.input.allocations[0].scopeRowIds.push(f.scopes[2]);
  assert.equal(f.review().pricingValid, true);
  f.dates.endsOn = null;
  assert.equal(
    f.review().blockers.filter((b) => b.code === "missing_term").length,
    2,
  );
  f.dates.endsOn = "2050-01-01";
  assert(f.review().blockers.some((b) => b.code === "invalid_term"));
  f.content.costs.items.pop();
  assert(f.review().blockers.some((b) => b.code === "unused_allocation"));
});
test("rate multiplication and combined charges respect the existing integer estimate ceiling", () => {
  const f = fixture();
  f.content.costs.items[2].unitPriceCents = 10_000_000_000;
  let review = f.review();
  assert(review.blockers.some((b) => b.code === "allocation_limit"));
  assert.equal(review.allocations[2].authorizedAmountCents, null);
  assert.equal(review.authorizedAmountCents, null);
  f.content.costs.items[2].quantity = 1;
  const visit = f.input.allocations[2];
  if (visit.basis !== "per_visit") throw new Error("Missing visit fixture");
  visit.maximumVisits = 1;
  review = f.review();
  assert.equal(review.allocations[2].authorizedAmountCents, 10_000_000_000);
  assert(review.blockers.some((b) => b.code === "combined_limit"));
});
test("request validation rejects repeated bases, duplicate scope IDs and unbounded visit counts", () => {
  const f = fixture();
  for (const maximumVisits of [0, -1, 1.5, 10001, null])
    assert.equal(
      agreementPricingReview.safeParse({
        expectedVersion: 1,
        allocations: [
          { basis: "per_visit", scopeRowIds: [f.scopes[0]], maximumVisits },
        ],
      }).success,
      false,
    );
  assert.equal(
    agreementPricingReview.safeParse({
      expectedVersion: 1,
      allocations: [f.input.allocations[0], f.input.allocations[0]],
    }).success,
    false,
  );
  f.input.allocations[0].scopeRowIds.push(f.scopes[0]);
  assert.equal(agreementPricingReview.safeParse(f.input).success, false);
});
