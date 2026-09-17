import { randomUUID } from "node:crypto";
import { presentComposition } from "./agreement-composition.service";
import { transaction } from "./database";
import { HttpError } from "./policy";
import {
  agreementPricingReview,
  reviewAgreementPricing,
} from "./agreement-pricing.contract";

export async function reviewCompositionPricing(id: string, raw: unknown) {
  const input = agreementPricingReview.parse(raw);
  return transaction(async (c) => {
    const row = (
      await c.query(
        "SELECT * FROM agreement_composition_draft WHERE id=$1 FOR SHARE",
        [id],
      )
    ).rows[0];
    if (!row) throw new HttpError(404, "Agreement draft not found");
    if (row.status !== "draft" || row.version !== input.expectedVersion)
      throw new HttpError(
        409,
        "The agreement draft changed. Reload before reviewing pricing.",
      );
    return reviewAgreementPricing(
      row.content,
      row.context_snapshot,
      row.dates,
      input,
    );
  });
}

export async function saveCompositionPricing(
  userId: string,
  id: string,
  raw: unknown,
) {
  const input = agreementPricingReview.parse(raw);
  return transaction(async (c) => {
    const old = (
      await c.query(
        "SELECT * FROM agreement_composition_draft WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!old) throw new HttpError(404, "Agreement draft not found");
    if (old.status !== "draft" || old.version !== input.expectedVersion)
      throw new HttpError(
        409,
        "The agreement draft changed. Reload before saving pricing.",
      );
    const review = reviewAgreementPricing(
      old.content,
      old.context_snapshot,
      old.dates,
      input,
    );
    if (!review.pricingValid)
      throw new HttpError(
        422,
        review.blockers.map((blocker) => blocker.message).join(" "),
      );
    const version = old.version + 1;
    const plan = {
      schemaVersion: 1,
      sourceVersion: version,
      allocations: input.allocations,
      review: { ...review, sourceVersion: version },
    };
    const row = (
      await c.query(
        "UPDATE agreement_composition_draft SET pricing_plan=$2,version=$3,updated_at=now() WHERE id=$1 RETURNING *",
        [id, JSON.stringify(plan), version],
      )
    ).rows[0];
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'agreement-draft.pricing_saved',$3,$4)",
      [
        randomUUID(),
        userId,
        id,
        JSON.stringify({
          previousVersion: old.version,
          version,
          bases: input.allocations.map((allocation) => allocation.basis),
          authorizedAmountCents: review.authorizedAmountCents,
        }),
      ],
    );
    return presentComposition(row);
  });
}
