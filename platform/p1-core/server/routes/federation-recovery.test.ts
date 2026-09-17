import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const mocks = vi.hoisted(() => ({ callback: vi.fn(), query: vi.fn() }));
vi.mock("../services/federation-client", async (original) => ({
  ...(await original<typeof import("../services/federation-client")>()),
  federationEnabled: () => true,
}));
vi.mock("../services/federation-runtime", () => ({
  FEDERATION_COOKIE: "p1_federation",
  federationConsumer: () => ({ callback: mocks.callback }),
}));
vi.mock("../storage", () => ({ storage: {} }));
vi.mock("../middleware/auth", () => ({ comparePassword: vi.fn(), clearTokenCookie: vi.fn() }));
vi.mock("../middleware/security", () => ({ loginLimiter: (_req: any, _res: any, next: any) => next() }));
vi.mock("../db", () => ({ pool: { query: mocks.query } }));
import { FederationError } from "../services/federation-client";
import router from "./federation.routes";
let server: Server, base: string;
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({ rows: [] });
  const app = express();
  app.use("/api/auth/federation", router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as any).port}/api/auth/federation`;
});
afterEach(async () => new Promise<void>((r) => server.close(() => r())));
it("recovers an unlinked browser callback to a fixed link form without forwarding secrets", async () => {
  mocks.callback.mockRejectedValue(new FederationError(403, "federation_link_required"));
  const response = await fetch(base + "/callback?state=private-state&code=private-code&return_to=https://evil.test", { redirect: "manual" });
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/admin/login?federation=link-required");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(await response.text()).not.toContain("private-");
  const cookies = response.headers.getSetCookie();
  expect(cookies).toHaveLength(5); // callback clears nonce/intent, recovery also clears confirmation
  expect(cookies.every((cookie) => cookie.includes("Expires=Thu, 01 Jan 1970"))).toBe(true);
  expect(cookies.some((cookie) => cookie.startsWith("p1_federation="))).toBe(false);
  expect(mocks.query).toHaveBeenCalledWith(expect.any(String), ["federation_link_required"]);
});
it("does not convert invalid state or identity conflicts into a linking continuation", async () => {
  for (const code of ["federation_state_invalid", "federation_identity_conflict"]) {
    mocks.callback.mockRejectedValue(new FederationError(401, code));
    const response = await fetch(base + "/callback", { redirect: "manual" });
    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
    expect(await response.json()).toEqual({ message: code });
  }
});
it("preserves explicit link confirmation", async () => {
  mocks.callback.mockResolvedValue({ nonce: "new-nonce", confirmation: "confirmation" });
  const response = await fetch(base + "/callback", { redirect: "manual" });
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/admin/login?federation=confirm");
});
