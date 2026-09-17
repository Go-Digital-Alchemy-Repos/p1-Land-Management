import { z } from "zod";
import {
  previewComposition,
  type CompositionContent,
  compositionDates,
} from "./agreement-composition.contract";
import { agreementTerms, fixedPeriodInput } from "./service-agreement.contract";

const scopeRowIds = z
  .array(z.string().uuid())
  .min(1)
  .max(200)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Choose each scope row only once within an allocation",
  );
const monthlyPeriod = fixedPeriodInput
  .extend({
    reviewReason: z.string().trim().max(1000).default(""),
  })
  .strict();
export const agreementPricingReview = z
  .object({
    expectedVersion: z.number().int().positive(),
    allocations: z
      .array(
        z.discriminatedUnion("basis", [
          z.object({ basis: z.literal("one_time"), scopeRowIds }).strict(),
          z
            .object({
              basis: z.literal("fixed_monthly"),
              scopeRowIds,
              periods: z.array(monthlyPeriod).max(120),
            })
            .strict(),
          z
            .object({
              basis: z.literal("per_visit"),
              scopeRowIds,
              maximumVisits: z.number().int().positive().max(10000),
            })
            .strict(),
        ]),
      )
      .max(3)
      .refine(
        (rows) => new Set(rows.map((row) => row.basis)).size === rows.length,
        "Use one allocation for each billing basis",
      ),
  })
  .strict();
export type AgreementPricingInput = z.infer<typeof agreementPricingReview>;
const bases = ["one_time", "fixed_monthly", "per_visit"] as const;
type Basis = (typeof bases)[number];
export type PricingBlocker = {
  code: string;
  basis: Basis | null;
  message: string;
};
const maximum = 10_000_000_000n;

/** A financial review only. Preparation must also validate current context,
 * recipient, schedule and operational allocation invariants in its transaction. */
export function reviewAgreementPricing(
  content: CompositionContent,
  context: Record<string, string | null>,
  dates: z.infer<typeof compositionDates>,
  request: AgreementPricingInput,
) {
  const preview = previewComposition(content, context, dates);
  const blockers: PricingBlocker[] = [];
  const block = (code: string, message: string, basis: Basis | null = null) =>
    blockers.push({ code, basis, message });
  if (preview.unresolvedPlaceholders.length)
    block(
      "unresolved_placeholders",
      "Resolve all agreement placeholders before preparing the proposal.",
    );
  if (!preview.content.terms.trim())
    block("missing_terms", "Add the agreement terms.");
  if (!content.scope.items.length)
    block("missing_scope", "Add scope rows before allocating prices.");
  if (!content.costs.items.length)
    block("missing_costs", "Add cost rows before reviewing prices.");
  const knownScope = new Set(content.scope.items.map((row) => row.id));
  const covered = new Set<string>();
  const allocations: {
    basis: Basis;
    scopeRowIds: string[];
    costRowIds: string[];
    rateCents: number;
    maximumVisits: number | null;
    periods: z.infer<typeof monthlyPeriod>[];
    authorizedAmountCents: number | null;
  }[] = [];
  let total = 0n;
  for (const basis of bases) {
    const costRows = content.costs.items.filter((row) => row.basis === basis);
    const allocation = request.allocations.find((row) => row.basis === basis);
    if (!costRows.length) {
      if (allocation)
        block(
          "unused_allocation",
          "This allocation has no matching cost rows.",
          basis,
        );
      continue;
    }
    if (!allocation) {
      block(
        "missing_allocation",
        "Allocate the scope and charge limits for this billing basis.",
        basis,
      );
      continue;
    }
    for (const id of allocation.scopeRowIds) {
      if (!knownScope.has(id))
        block(
          "unknown_scope",
          "An allocated scope row no longer exists. Review the saved scope again.",
          basis,
        );
      else covered.add(id);
    }
    const rate = preview.totalsByBasis[basis];
    let authorized = BigInt(rate);
    if (rate <= 0)
      block(
        "zero_rate",
        "This billing basis needs a positive total rate.",
        basis,
      );
    if (allocation.basis !== "one_time") {
      if (!dates.startsOn || !dates.endsOn) {
        block(
          "missing_term",
          "Set both agreement start and end dates for recurring prices.",
          basis,
        );
      } else {
        const terms = agreementTerms.safeParse({
          title: "Pricing review",
          startsOn: dates.startsOn,
          endsOn: dates.endsOn,
          billingMode: basis,
          unitAmountCents: allocation.basis === "per_visit" ? rate : null,
          periods:
            allocation.basis === "fixed_monthly"
              ? allocation.periods.map(({ reviewReason, ...period }) => period)
              : [],
        });
        if (!terms.success)
          for (const issue of terms.error.issues)
            block("invalid_term", issue.message, basis);
      }
    }
    if (allocation.basis === "fixed_monthly") {
      authorized = allocation.periods.reduce(
        (sum, period) => sum + BigInt(period.amountCents),
        0n,
      );
      for (const period of allocation.periods) {
        const first = new Date(period.startsOn + "T00:00:00Z");
        const last = new Date(period.endsOn + "T00:00:00Z");
        const lastDay = new Date(
          Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0),
        ).getUTCDate();
        const partial =
          first.getUTCDate() !== 1 || last.getUTCDate() !== lastDay;
        if ((partial || period.amountCents !== rate) && !period.reviewReason)
          block(
            "period_review_required",
            `Explain the explicit charge for ${period.startsOn} through ${period.endsOn}; partial periods and changes from the monthly rate require review.`,
            basis,
          );
      }
    } else if (allocation.basis === "per_visit") {
      authorized *= BigInt(allocation.maximumVisits);
    }
    if (authorized <= 0n || authorized > maximum)
      block(
        "allocation_limit",
        "The authorized allocation must be positive and no more than $100,000,000.",
        basis,
      );
    total += authorized;
    allocations.push({
      basis,
      scopeRowIds: [...allocation.scopeRowIds],
      costRowIds: costRows.map((row) => row.id),
      rateCents: rate,
      maximumVisits:
        allocation.basis === "per_visit" ? allocation.maximumVisits : null,
      periods: allocation.basis === "fixed_monthly" ? allocation.periods : [],
      authorizedAmountCents:
        authorized > 0n && authorized <= maximum ? Number(authorized) : null,
    });
  }
  const unallocatedScopeRowIds = [...knownScope].filter(
    (id) => !covered.has(id),
  );
  if (unallocatedScopeRowIds.length)
    block(
      "unallocated_scope",
      "Every scope row must be assigned to at least one billing allocation. A shared row may be selected explicitly in more than one allocation.",
    );
  if (total > maximum)
    block(
      "combined_limit",
      "The combined authorized amount exceeds the supported $100,000,000 estimate limit.",
    );
  return {
    sourceVersion: request.expectedVersion,
    pricingValid: blockers.length === 0,
    authorizedAmountCents: blockers.length === 0 ? Number(total) : null,
    allocations,
    blockers,
    unallocatedScopeRowIds,
  };
}
