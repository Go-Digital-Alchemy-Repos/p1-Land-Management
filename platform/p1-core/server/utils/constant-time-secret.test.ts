import { describe, expect, it } from "vitest";
import { constantTimeSecretEquals } from "./constant-time-secret";

describe("constantTimeSecretEquals", () => {
  it("accepts only matching non-empty secrets", () => {
    expect(constantTimeSecretEquals("secret", "secret")).toBe(true);
    expect(constantTimeSecretEquals("secret", "other")).toBe(false);
    expect(constantTimeSecretEquals("short", "longer")).toBe(false);
    expect(constantTimeSecretEquals(undefined, "secret")).toBe(false);
    expect(constantTimeSecretEquals("secret", undefined)).toBe(false);
    expect(constantTimeSecretEquals("secret", null)).toBe(false);
  });
});
