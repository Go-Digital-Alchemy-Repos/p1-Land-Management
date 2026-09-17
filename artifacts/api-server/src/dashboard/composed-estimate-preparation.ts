import type { z } from "zod";
import { compositionPreparation } from "./composed-estimate-preparation.contract";
import {
  compositionContent,
  compositionDates,
  previewComposition,
} from "./agreement-composition.contract";
import {
  agreementPricingReview,
  reviewAgreementPricing,
} from "./agreement-pricing.contract";
import { HttpError } from "./policy";

/** Pure preparation boundary. Database eligibility, locks and persistence belong
 * to the caller; no operational records or schedules are created here. */
export function prepareCompositionDocument(
  draft: {
    version: number;
    content: unknown;
    dates: unknown;
    context_snapshot: Record<string, string | null>;
    pricing_plan: unknown;
  },
  input: z.infer<typeof compositionPreparation>,
) {
  const content = compositionContent.parse(draft.content);
  const dates = compositionDates.parse(draft.dates);
  const plan = draft.pricing_plan as {
    schemaVersion?: number;
    sourceVersion?: number;
    allocations?: unknown;
  } | null;
  if (
    draft.version !== input.expectedVersion ||
    plan?.schemaVersion !== 1 ||
    plan.sourceVersion !== draft.version
  )
    throw new HttpError(
      409,
      "Save a pricing review for the current draft before preparing the proposal.",
    );
  // Recompute from source inputs. The saved review's totals are never trusted.
  const pricing = agreementPricingReview.parse({
    expectedVersion: draft.version,
    allocations: plan.allocations,
  });
  const review = reviewAgreementPricing(
    content,
    draft.context_snapshot,
    dates,
    pricing,
  );
  if (!review.pricingValid || review.authorizedAmountCents === null)
    throw new HttpError(
      422,
      review.blockers.map((blocker) => blocker.message).join(" "),
    );
  const preview = previewComposition(content, draft.context_snapshot, dates);
  const recurring = review.allocations.filter(
    (allocation) => allocation.basis !== "one_time",
  );
  if (
    input.schedules.length !== recurring.length ||
    input.schedules.some(
      (schedule) =>
        !recurring.some((allocation) => allocation.basis === schedule.basis),
    )
  )
    throw new HttpError(
      422,
      "Choose exactly one service schedule for each recurring billing component.",
    );
  const allocations = review.allocations.map((allocation) => {
    const scopeRows = preview.content.scope.items.filter((row) =>
      allocation.scopeRowIds.includes(row.id),
    );
    const scope = [
      ...scopeRows.map((row) =>
        [row.title, row.description].filter(Boolean).join("\n"),
      ),
      preview.content.notes.scope,
      preview.content.scope.exclusions
        ? `Exclusions\n${preview.content.scope.exclusions}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const schedule = input.schedules.find(
      (row) => row.basis === allocation.basis,
    );
    let configuration = null;
    if (allocation.basis !== "one_time") {
      if (
        !schedule ||
        !dates.startsOn ||
        !dates.endsOn ||
        schedule.firstVisitOn < dates.startsOn ||
        schedule.firstVisitOn > dates.endsOn
      )
        throw new HttpError(
          422,
          "Each first service date must fall within the reviewed agreement term.",
        );
      configuration = {
        billingMode: allocation.basis,
        startsOn: dates.startsOn,
        endsOn: dates.endsOn,
        cadence: schedule.cadence,
        intervalCount: schedule.intervalCount,
        localTime: schedule.localTime,
        firstVisitOn: schedule.firstVisitOn,
        unitAmountCents:
          allocation.basis === "per_visit" ? allocation.rateCents : null,
        periods: allocation.periods.map(
          ({ reviewReason, ...period }) => period,
        ),
        ...(allocation.basis === "per_visit"
          ? { maximumVisits: allocation.maximumVisits }
          : {}),
      };
    }
    return { ...allocation, scope, configuration };
  });
  return {
    content: preview.content,
    dates,
    authorizedAmountCents: review.authorizedAmountCents,
    allocations,
    review,
  };
}
