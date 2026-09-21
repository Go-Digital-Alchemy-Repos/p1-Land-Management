import { canManageServiceAgreements } from "@workspace/api-zod/business-access";
import type { Actor } from "./access";
import { HttpError, requireCapability } from "./policy";

export function requireAgreementManagement(a: Actor) {
  requireCapability(a, "revenue.agreements");
  if (!canManageServiceAgreements(a))
    throw new HttpError(
      403,
      "Dispatch can review agreement scope and status but cannot change terms",
    );
}
