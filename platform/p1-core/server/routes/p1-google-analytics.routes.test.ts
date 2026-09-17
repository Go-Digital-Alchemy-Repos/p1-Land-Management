import { afterEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const calls = vi.hoisted(() => ({
  reports: vi.fn(),
  realtime: vi.fn(),
  search: vi.fn(),
  permission: vi.fn(),
}));
vi.mock("../middleware/auth", () => ({
  authenticateToken: (req: any, res: any, next: any) =>
    req.headers.authorization ? next() : res.status(401).end(),
  requireAdminPermission: (permission: string) => {
    calls.permission(permission);
    return (req: any, res: any, next: any) =>
      req.headers.authorization === "owner" ? next() : res.status(403).end();
  },
}));
vi.mock("../services/p1-google-analytics.service", async () => {
  const original = await vi.importActual<any>("../services/p1-google-analytics.service");
  return { ...original, p1GoogleAnalytics: { reports: calls.reports, realtime: calls.realtime } };
});
vi.mock("../services/p1-search-console.service", () => ({
  p1SearchConsole: { reports: calls.search },
}));
import router from "./p1-google-analytics.routes";
let server: Server;
afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  calls.reports.mockReset();
  calls.search.mockReset();
  calls.realtime.mockReset();
});
async function start() {
  const app = express();
  app.use("/api/p1/google-analytics", router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${(server.address() as any).port}/api/p1/google-analytics`;
}
it("protects all reporting endpoints before provider calls with crm permission", async () => {
  const base = await start();
  for (const path of ["", "/realtime", "/search-console"]) {
    expect((await fetch(base + path)).status).toBe(401);
    expect((await fetch(base + path, { headers: { authorization: "staff" } })).status).toBe(403);
  }
  expect(calls.reports).not.toHaveBeenCalled();
  expect(calls.realtime).not.toHaveBeenCalled();
  expect(calls.search).not.toHaveBeenCalled();
  expect(calls.permission).toHaveBeenCalledWith("crm");
});
it("returns reports privately and hides unknown provider exceptions", async () => {
  const base = await start();
  calls.reports.mockResolvedValue({ status: "empty" });
  const response = await fetch(base + "?startDate=2026-09-01&endDate=2026-09-02", {
    headers: { authorization: "owner" },
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(calls.reports).toHaveBeenCalledWith("2026-09-01", "2026-09-02");
  calls.realtime.mockRejectedValue(new Error("secret-token"));
  const failed = await fetch(base + "/realtime", { headers: { authorization: "owner" } });
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("secret-token");
});

it("returns Search Console reports privately and sanitizes failures", async () => {
  const base = await start();
  calls.search.mockResolvedValue({ status: "empty" });
  const response = await fetch(base + "/search-console?startDate=2026-09-01&endDate=2026-09-02", {
    headers: { authorization: "owner" },
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(calls.search).toHaveBeenCalledWith("2026-09-01", "2026-09-02");
  calls.search.mockRejectedValue(new Error("secret-token"));
  const failed = await fetch(base + "/search-console", { headers: { authorization: "owner" } });
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("secret-token");
});
