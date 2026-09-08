import { customFetch } from "../custom-fetch";
import type { CreateSalesEstimate, CreatedResource } from "./models";

/**
 * Compatibility surface for the original amount-only estimate contract.
 * New integrations should use the itemized lifecycle estimate API.
 */
export const getCreateSalesEstimateUrl = () => "/api/v1/estimates";

export const createSalesEstimate = async (
  createSalesEstimate: CreateSalesEstimate,
  options?: RequestInit,
): Promise<CreatedResource> =>
  customFetch<CreatedResource>(getCreateSalesEstimateUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(createSalesEstimate),
  });
