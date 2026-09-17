import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock("../storage", () => ({ storage: { settings: { getCategorySnapshot: state.snapshot } } }));
import router from "./website-colors-public.routes";
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
it("publishes only validated colors, retains muted fallback and does not invent overrides", async () => {
  state.snapshot.mockResolvedValue({
    version: "private",
    values: {
      brand_primary_color: " 123abc ",
      text_body_color: "</style><script>bad()</script>",
      text_muted_color: "#111111",
      text_helper_text_color: "#223344",
      company_name: "not public",
      token: "private",
    },
  });
  const response = await fetch(base + "/website-colors");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    schemaVersion: 1,
    stackId: "p1-land-management",
    colors: {
      brand_primary_color: "#123ABC",
      text_heading_subtext_color: "#111111",
      text_supporting_copy_color: "#111111",
      text_helper_text_color: "#223344",
    },
  });
  expect(state.snapshot).toHaveBeenCalledWith("branding", true);
  state.snapshot.mockResolvedValue({ values: {} });
  expect((await (await fetch(base + "/website-colors")).json()).colors).toEqual({});
  expect((await fetch(base + "/website-colors?category=private")).status).toBe(400);
  expect((await fetch(base + "/website-colors", { method: "PUT" })).status).toBe(404);
});
it("storage/private-category failures never disclose details", async () => {
  state.snapshot.mockRejectedValue(Error("private value"));
  const response = await fetch(base + "/website-colors");
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Website colors unavailable" });
});
