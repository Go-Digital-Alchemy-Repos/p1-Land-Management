import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agreementTerms,
  monthlyPeriods,
  prepareChargeInput,
} from "./service-agreement.contract";
test("agreement charge plans require explicit complete monthly periods without proration", () => {
  const periods = monthlyPeriods("2028-02-10", "2028-03-05");
  assert.deepEqual(periods, [
    { startsOn: "2028-02-10", endsOn: "2028-02-29" },
    { startsOn: "2028-03-01", endsOn: "2028-03-05" },
  ]);
  const input = {
    title: "Approved scope",
    startsOn: "2028-02-10",
    endsOn: "2028-03-05",
    billingMode: "fixed_monthly",
    unitAmountCents: null,
    periods: periods.map((p) => ({ ...p, amountCents: 12500 })),
  };
  assert.equal(agreementTerms.safeParse(input).success, true);
  assert.equal(
    agreementTerms.safeParse({ ...input, periods: input.periods.slice(1) })
      .success,
    false,
  );
  assert.equal(
    agreementTerms.safeParse({
      ...input,
      periods: [input.periods[1], input.periods[0]],
    }).success,
    false,
  );
  assert.equal(
    agreementTerms.safeParse({
      ...input,
      periods: [{ ...input.periods[0], amountCents: 12.5 }, input.periods[1]],
    }).success,
    false,
  );
  assert.equal(
    agreementTerms.safeParse({ ...input, unitAmountCents: 12500 }).success,
    false,
  );
  assert.equal(
    agreementTerms.safeParse({ ...input, endsOn: "2040-03-05" }).success,
    false,
  );
  assert.equal(
    agreementTerms.safeParse({ ...input, startsOn: "2028-02-30" }).success,
    false,
  );
});
test("per-visit terms require a price and charge selection has exactly one stable source", () => {
  const input = {
    title: "Reviewed visits",
    startsOn: "2028-01-01",
    endsOn: "2028-12-31",
    billingMode: "per_visit",
    unitAmountCents: 10000,
    periods: [],
  };
  assert.equal(agreementTerms.safeParse(input).success, true);
  assert.equal(
    agreementTerms.safeParse({ ...input, unitAmountCents: null }).success,
    false,
  );
  assert.equal(
    agreementTerms.safeParse({ ...input, unitAmountCents: 0 }).success,
    false,
  );
  assert.equal(
    prepareChargeInput.safeParse({ periodStart: "2028-01-01" }).success,
    true,
  );
  assert.equal(
    prepareChargeInput.safeParse({
      workOrderId: "e4a307aa-08b6-4f12-b731-14f6f9aefedc",
    }).success,
    true,
  );
  assert.equal(
    prepareChargeInput.safeParse({
      workOrderId: "e4a307aa-08b6-4f12-b731-14f6f9aefedc",
      periodStart: "2028-01-01",
    }).success,
    false,
  );
  assert.equal(prepareChargeInput.safeParse({}).success, false);
});
