import { z } from "zod";
const date = z.string().date();
const cents = z.number().int().positive().max(10_000_000_000);
export const fixedPeriodInput = z
  .object({ startsOn: date, endsOn: date, amountCents: cents })
  .strict();
export const agreementTerms = z
  .object({
    title: z.string().trim().min(1).max(500),
    startsOn: date,
    endsOn: date,
    billingMode: z.enum(["fixed_monthly", "per_visit"]),
    unitAmountCents: cents.nullable(),
    periods: z.array(fixedPeriodInput).max(120),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.endsOn < value.startsOn) {
      ctx.addIssue({
        code: "custom",
        message: "Term end must follow its start",
        path: ["endsOn"],
      });
      return;
    }
    const first = new Date(value.startsOn + "T00:00:00Z"),
      last = new Date(value.endsOn + "T00:00:00Z");
    const months =
      (last.getUTCFullYear() - first.getUTCFullYear()) * 12 +
      last.getUTCMonth() -
      first.getUTCMonth() +
      1;
    if (months > 120) {
      ctx.addIssue({
        code: "custom",
        message: "Use a term of at most 120 calendar months",
        path: ["endsOn"],
      });
      return;
    }
    if (value.billingMode === "per_visit") {
      if (value.unitAmountCents === null || value.periods.length)
        ctx.addIssue({
          code: "custom",
          message: "Per-visit terms require a rate and no monthly periods",
        });
      return;
    }
    if (value.unitAmountCents !== null)
      ctx.addIssue({
        code: "custom",
        message: "Monthly charges use explicit period amounts",
        path: ["unitAmountCents"],
      });
    const expected = monthlyPeriods(value.startsOn, value.endsOn);
    if (value.periods.length !== expected.length) {
      ctx.addIssue({
        code: "custom",
        message: "Enter an explicit amount for every monthly period",
        path: ["periods"],
      });
      return;
    }
    for (let i = 0; i < expected.length; i++)
      if (
        value.periods[i].startsOn !== expected[i].startsOn ||
        value.periods[i].endsOn !== expected[i].endsOn
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Periods must exactly cover the term in calendar-month order",
          path: ["periods", i],
        });
    if (
      value.periods.reduce((sum, p) => sum + p.amountCents, 0) > 10_000_000_000
    )
      ctx.addIssue({
        code: "custom",
        message: "Charge plan exceeds supported approved amount",
        path: ["periods"],
      });
  });
export function monthlyPeriods(startsOn: string, endsOn: string) {
  const result: { startsOn: string; endsOn: string }[] = [];
  let start = startsOn;
  while (start <= endsOn && result.length < 121) {
    const d = new Date(start + "T00:00:00Z");
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);
    result.push({ startsOn: start, endsOn: last < endsOn ? last : endsOn });
    start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
      .toISOString()
      .slice(0, 10);
  }
  return result;
}
export const createAgreementInput = z
  .object({
    id: z.string().uuid(),
    propertyId: z.string().uuid(),
    recurringServiceId: z.string().uuid(),
    estimateId: z.string().uuid(),
    predecessorId: z.string().uuid().nullable(),
    terms: agreementTerms,
  })
  .strict();
export const editAgreementInput = z
  .object({ version: z.number().int().positive(), terms: agreementTerms })
  .strict();
export const activateAgreementInput = z
  .object({ version: z.number().int().positive() })
  .strict();
export const cancelAgreementInput = z
  .object({
    version: z.number().int().positive(),
    effectiveOn: date,
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();
export const prepareChargeInput = z.union([
  z.object({ periodStart: date }).strict(),
  z.object({ workOrderId: z.string().uuid() }).strict(),
]);

export const agreementOperational = z
  .object({
    id: z.string().uuid(),
    propertyId: z.string().uuid(),
    recurringServiceId: z.string().uuid(),
    title: z.string(),
    startsOn: date,
    endsOn: date,
    status: z.enum(["draft", "active", "cancelled"]),
    scope: z.string(),
    cancellationEffectiveOn: date.nullable(),
  })
  .strict();
export const agreementFinancial = agreementOperational
  .extend({
    version: z.number().int().positive(),
    estimateId: z.string().uuid(),
    estimateRevision: z.number().int().positive(),
    predecessorId: z.string().uuid().nullable(),
    billingMode: z.enum(["fixed_monthly", "per_visit"]),
    unitAmountCents: cents.nullable(),
    activatedOn: date.nullable(),
    cancellationReason: z.string().nullable(),
    periods: z.array(
      fixedPeriodInput.extend({ id: z.string().uuid() }).strict(),
    ),
  })
  .strict();
