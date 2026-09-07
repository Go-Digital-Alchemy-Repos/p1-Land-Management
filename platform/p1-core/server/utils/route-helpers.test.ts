import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { getBaseUrl } from "./route-helpers";
afterEach(() => vi.unstubAllEnvs());
describe("canonical admin links behind the P1 gateway", () => {
 it("uses configured public origin instead of a private backend Host", () => {
  vi.stubEnv("CORE_PLATFORM_ADMIN_ORIGIN","https://www.p1landmanagement.com");
  expect(getBaseUrl({protocol:"http",get:()=>"p1-core.railway.internal"} as unknown as Request)).toBe("https://www.p1landmanagement.com");
 });
 it("fails closed for production links without a configured origin", () => {
  vi.stubEnv("NODE_ENV","production");vi.stubEnv("CORE_PLATFORM_ADMIN_ORIGIN","");vi.stubEnv("APP_URL","");
  expect(()=>getBaseUrl({protocol:"http",get:()=>"untrusted.invalid"} as unknown as Request)).toThrow("APP_URL");
 });
});
