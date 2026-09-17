import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock("../storage", () => ({ storage: { settings: { getCategorySnapshot: state.snapshot } } }));
import router from "./website-head-public.routes";
let server: Server, base: string;
beforeEach(async () => {
  vi.clearAllMocks();
  const app = express();
  app.use(router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => new Promise<void>((r) => server.close(() => r())));
it("projects only bounded public markup and never category secrets or version metadata", async () => {
  state.snapshot.mockResolvedValue({
    values: {
      public_head_html: '<meta name="verification" content="literal">',
      other: "not published",
    },
    version: "private revision",
  });
  const response = await fetch(base + "/website-head-tags");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(await response.json()).toEqual({
    schemaVersion: 1,
    stackId: "p1-land-management",
    html: '<meta name="verification" content="literal">',
  });
  expect(state.snapshot).toHaveBeenCalledWith("head_tag_additions", true);
  state.snapshot.mockResolvedValue({ values: {}, version: "empty" });
  expect((await (await fetch(base + "/website-head-tags")).json()).html).toBe("");
  expect((await fetch(base + "/website-head-tags?category=credentials")).status).toBe(400);
  expect((await fetch(base + "/website-head-tags", { method: "PUT" })).status).toBe(404);
});
it("private/corrupt/unavailable storage fails without exposing data", async () => {
  for (const result of [
    { values: { public_head_html: "x".repeat(100001) } },
    { values: { public_head_html: 3 } },
  ]) {
    state.snapshot.mockResolvedValue(result);
    const response = await fetch(base + "/website-head-tags");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Website head markup unavailable" });
  }
  state.snapshot.mockRejectedValue(new Error("private value must not escape"));
  const response = await fetch(base + "/website-head-tags");
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private value");
});
