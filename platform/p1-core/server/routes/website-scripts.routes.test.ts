import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { ZodError } from "zod";
const state = vi.hoisted(() => ({
  save: vi.fn(),
  owner: vi.fn(),
  public: vi.fn(),
  identity: { active: true, role: "owner", ownerAttested: true } as any,
}));
vi.mock("../storage", () => ({ storage: { settings: { upsertSettings: state.save } } }));
vi.mock("../services/website-script-management.service", () => ({
  websiteScriptManagement: { ownerConfiguration: state.owner, publicConfiguration: state.public },
}));
import ownerRouter from "./website-scripts.routes";
import publicRouter from "./website-head-public.routes";
let server: Server, base: string;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = { id: "owner" };
    req.dashboardIdentity = state.identity;
    next();
  });
  app.use("/scripts", ownerRouter);
  app.use("/p1", publicRouter);
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
    res
      .status(error instanceof ZodError ? 400 : error.statusCode || 500)
      .json({ message: "Request unavailable" }),
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
beforeEach(() => {
  vi.clearAllMocks();
  state.identity = { active: true, role: "owner", ownerAttested: true };
  state.owner.mockResolvedValue({ version: "a".repeat(64) });
  state.public.mockResolvedValue({
    schemaVersion: 1,
    googleAnalytics: { source: "managed", measurementId: "G-TEST" },
  });
});
const body = {
  expectedVersion: "a".repeat(64),
  googleAnalytics: { source: "managed", measurementId: "G-TEST" },
};
const put = (value: unknown) =>
  fetch(base + "/scripts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
it("owner writes exact bounded category keys with CAS and actor audit", async () => {
  expect((await put(body)).status).toBe(200);
  const [entries, expected, audit] = state.save.mock.calls[0];
  expect(entries).toEqual([
    {
      key: "google_analytics_source",
      category: "website_script_management",
      isSecret: false,
      value: "managed",
    },
    {
      key: "google_analytics_measurement_id",
      category: "website_script_management",
      isSecret: false,
      value: "G-TEST",
    },
  ]);
  expect(expected).toEqual({
    category: "website_script_management",
    version: body.expectedVersion,
    keyRules: { google_analytics_source: false, google_analytics_measurement_id: false },
  });
  expect(audit.userId).toBe("owner");
  expect((await fetch(base + "/scripts")).headers.get("cache-control")).toContain("no-store");
});
it("denies members, inactive and unattested identities before storage", async () => {
  for (const identity of [
    null,
    { active: true, role: "member", ownerAttested: true },
    { active: false, role: "owner", ownerAttested: true },
    { active: true, role: "owner", ownerAttested: false },
  ]) {
    state.identity = identity;
    expect((await put(body)).status).toBe(403);
    expect((await fetch(base + "/scripts")).status).toBe(403);
  }
  expect(state.save).not.toHaveBeenCalled();
  expect(state.owner).not.toHaveBeenCalled();
});
it("rejects secret fields, arbitrary targets and absent versions; never retries stale writes", async () => {
  for (const value of [
    { googleAnalytics: body.googleAnalytics },
    { ...body, secret: "private" },
    { ...body, googleAnalytics: { ...body.googleAnalytics, scriptUrl: "https://evil.test" } },
    { ...body, googleAnalytics: { source: "managed", measurementId: "<script>" } },
  ])
    expect((await put(value)).status).toBe(400);
  expect(state.save).not.toHaveBeenCalled();
  state.save.mockRejectedValueOnce({ statusCode: 409 });
  expect((await put(body)).status).toBe(409);
  expect(state.save).toHaveBeenCalledOnce();
});
it("public projection is no-store, permits no query and sanitizes failures", async () => {
  state.identity = null;
  const response = await fetch(base + "/p1/website-script-config");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    schemaVersion: 1,
    googleAnalytics: { source: "managed", measurementId: "G-TEST" },
  });
  expect((await fetch(base + "/p1/website-script-config?secret=true")).status).toBe(400);
  state.public.mockRejectedValueOnce(new Error("private credential"));
  const failed = await fetch(base + "/p1/website-script-config");
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("private credential");
});
