import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock("../storage", () => ({ storage: { settings: { getCategorySnapshot: state.snapshot } } }));
import router from "./website-social-public.routes";
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
it("projects normalized safe profiles and style without private settings or metadata", async () => {
  state.snapshot.mockResolvedValue({
    values: {
      social_facebook_url: " https://EXAMPLE.test/a b ",
      social_x_url: "javascript:bad()",
      social_yelp_url: "https://user:password@example.test",
      social_icon_style: "outline",
      company_name: "not projected",
      private_key: "secret",
    },
    version: "private",
  });
  const response = await fetch(base + "/website-social");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    schemaVersion: 1,
    stackId: "p1-land-management",
    iconStyle: "outline",
    links: [{ platform: "facebook", url: "https://example.test/a%20b" }],
  });
  expect(state.snapshot).toHaveBeenCalledWith("branding", true);
  state.snapshot.mockResolvedValue({
    values: { social_facebook_url: "", social_icon_style: "unknown" },
  });
  expect(await (await fetch(base + "/website-social")).json()).toEqual({
    schemaVersion: 1,
    stackId: "p1-land-management",
    iconStyle: "brand",
    links: [],
  });
  expect((await fetch(base + "/website-social?key=secret")).status).toBe(400);
  expect((await fetch(base + "/website-social", { method: "PUT" })).status).toBe(404);
});
it("private category or unavailable storage produces a generic failure", async () => {
  state.snapshot.mockRejectedValue(Error("secret failure detail"));
  const response = await fetch(base + "/website-social");
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Website social links unavailable" });
});
