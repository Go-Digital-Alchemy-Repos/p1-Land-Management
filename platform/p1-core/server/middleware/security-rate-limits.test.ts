import { describe, expect, it, vi } from "vitest";
import {
  crmInboundRateLimitPolicy,
  ecommerceCheckoutRateLimitPolicy,
  ecommerceOrderLookupRateLimitPolicy,
  ecommercePricingRateLimitPolicy,
  noStorePrivateResponse,
} from "./security";

describe("sensitive ecommerce rate limit policies", () => {
  it("constrains external CRM intake below the general API limit", () => {
    expect(crmInboundRateLimitPolicy).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 60,
    });
  });

  it("keeps checkout PaymentIntent creation tighter than the general API limit", () => {
    expect(ecommerceCheckoutRateLimitPolicy).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 20,
    });
  });

  it("keeps public order lookup constrained because it protects private order data", () => {
    expect(ecommerceOrderLookupRateLimitPolicy).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 30,
    });
  });

  it("keeps public ecommerce pricing and quote endpoints below the general API limit", () => {
    expect(ecommercePricingRateLimitPolicy).toMatchObject({
      windowMs: 10 * 60 * 1000,
      max: 120,
    });
  });

  it("marks sensitive ecommerce responses as private no-store", () => {
    const headers = new Map<string, string>();
    const res = {
      setHeader: (key: string, value: string) => headers.set(key, value),
    };
    const next = vi.fn();

    noStorePrivateResponse({} as never, res as never, next);

    expect(headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(headers.get("Pragma")).toBe("no-cache");
    expect(headers.get("Expires")).toBe("0");
    expect(next).toHaveBeenCalledOnce();
  });
});
