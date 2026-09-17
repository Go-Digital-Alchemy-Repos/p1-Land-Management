import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({
  authenticate: vi.fn(),
  user: vi.fn(),
  reports: vi.fn(),
  realtime: vi.fn(),
  search: vi.fn(),
}));
vi.mock("../services/federation-runtime", () => ({
  federationConsumer: () => ({ authenticateServiceGrant: state.authenticate }),
  FEDERATION_COOKIE: "test",
  hasFederationHistory: vi.fn(),
}));
vi.mock("../storage/index", () => ({ storage: { users: { getUser: state.user } } }));
vi.mock("../services/p1-google-analytics.service", async () => ({
  ...(await vi.importActual<any>("../services/p1-google-analytics.service")),
  p1GoogleAnalytics: { reports: state.reports, realtime: state.realtime },
}));
vi.mock("../services/p1-search-console.service", () => ({
  p1SearchConsole: { reports: state.search },
}));
import router from "./business-center-reporting.routes";
const key = "s".repeat(43),
  grantId = "11111111-1111-4111-8111-111111111111";
let server: Server, base: string;
const previous = {
  enabled: process.env.CORE_FEDERATION_ENABLED,
  key: process.env.DASHBOARD_MARKETING_SERVICE_KEY,
};
beforeEach(async () => {
  process.env.CORE_FEDERATION_ENABLED = "true";
  process.env.DASHBOARD_MARKETING_SERVICE_KEY = key;
  state.user.mockResolvedValue({ id: "linked", role: "admin", isSuspended: false });
  state.authenticate.mockResolvedValue({
    userId: "linked",
    grant: {
      active: true,
      role: "member",
      capabilities: ["marketing.analytics.view"],
      ownerAttested: false,
    },
  });
  state.reports.mockResolvedValue({ status: "empty" });
  state.realtime.mockResolvedValue({ status: "empty" });
  state.search.mockResolvedValue({ status: "empty" });
  const app = express();
  app.use(express.json());
  app.use(router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.clearAllMocks();
  for (const [env, value] of [
    ["CORE_FEDERATION_ENABLED", previous.enabled],
    ["DASHBOARD_MARKETING_SERVICE_KEY", previous.key],
  ]) {
    if (value === undefined) delete process.env[env!];
    else process.env[env!] = value;
  }
});
function request(
  path = "/analytics",
  headers: Record<string, string> = {},
  body: unknown = { grantId },
) {
  return fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
it("rejects browser-shaped and malformed ingress before identity or provider work", async () => {
  for (const headers of [
    { origin: "https://dashboard.example.test" },
    { cookie: "session=opaque" },
    { "sec-fetch-site": "same-origin" },
    { authorization: "Bearer wrong" },
  ])
    expect((await request("/analytics", headers)).status).toBe(401);
  expect(
    (await request("/analytics", {}, { grantId, capabilities: ["marketing.analytics.view"] }))
      .status,
  ).toBe(400);
  expect((await request("/unknown")).status).toBe(404);
  expect(state.authenticate).not.toHaveBeenCalled();
  expect(state.reports).not.toHaveBeenCalled();
});
it("uses fresh user grants independently of the linked local admin role", async () => {
  expect((await request("/analytics?startDate=2026-09-01&endDate=2026-09-02")).status).toBe(200);
  expect(state.reports).toHaveBeenCalledWith("2026-09-01", "2026-09-02");
  expect((await request("/search-console")).status).toBe(403);
  expect(state.search).not.toHaveBeenCalled();
  state.authenticate.mockResolvedValue({
    userId: "linked",
    grant: {
      active: true,
      role: "member",
      capabilities: ["marketing.search-console.view"],
      ownerAttested: false,
    },
  });
  expect((await request("/analytics")).status).toBe(403);
  const response = await request("/search-console");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  state.user.mockResolvedValue({ id: "linked", role: "admin", isSuspended: true });
  expect((await request("/search-console")).status).toBe(403);
});
