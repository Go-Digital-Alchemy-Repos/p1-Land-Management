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
