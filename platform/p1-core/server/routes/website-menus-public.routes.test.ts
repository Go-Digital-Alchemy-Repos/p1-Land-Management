import express from "express";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({ get: vi.fn(), features: vi.fn() }));
vi.mock("../services/site-features.service", () => ({ getSiteFeatures: state.features }));
vi.mock("../services/public-website-menus.service", () => ({
  getPublicWebsiteMenus: state.get,
  projectPublicWebsiteMenus: () => ({
    schemaVersion: 1,
    stackId: "p1-land-management",
    locations: {
      main_navigation: null,
      p1_footer_services: null,
      p1_footer_service_areas: null,
      p1_footer_company: null,
    },
  }),
}));
import router from "./website-menus-public.routes";
let server: Server, base: string;
beforeAll(async () => {
  const app = express();
  app.use("/api/p1", router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/p1/website-menus`;
});
afterAll(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);
beforeEach(() => {
  state.get.mockReset();
  state.features.mockResolvedValue({ cmsEnabled: true });
  state.get.mockResolvedValue({
    schemaVersion: 1,
    stackId: "p1-land-management",
    revision: "a".repeat(64),
    locations: {
      main_navigation: null,
      p1_footer_services: null,
      p1_footer_service_areas: null,
      p1_footer_company: null,
    },
  });
});
it("serves a public bounded projection with no-store and nosniff", async () => {
  const response = await fetch(base);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect((await response.json()).locations.main_navigation).toBeNull();
});
it("rejects arbitrary queries and mutation methods before accessing data", async () => {
  expect((await fetch(base + "?location=private")).status).toBe(400);
  expect((await fetch(base, { method: "POST" })).status).toBe(404);
  expect(state.get).not.toHaveBeenCalled();
});
it("returns generic unavailable response without private errors", async () => {
  state.get.mockRejectedValue(Error("private database secret"));
  const response = await fetch(base);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Website menus unavailable" });
});

it("returns authoritative empty assignments when CMS is disabled without reading menus", async () => {
  state.features.mockResolvedValue({ cmsEnabled: false });
  const response = await fetch(base);
  expect(response.status).toBe(200);
  expect(Object.values((await response.json()).locations)).toEqual([null, null, null, null]);
  expect(state.get).not.toHaveBeenCalled();
});
