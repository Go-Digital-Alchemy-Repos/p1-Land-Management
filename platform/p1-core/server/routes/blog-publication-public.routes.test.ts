import express from "express";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { Server } from "node:http";
vi.mock("../db", () => ({ db: { transaction: async (fn: (tx: object) => unknown) => fn({}) } }));
vi.mock("../services/public-blog-media.service", () => ({
  resolvePublicBlogMedia: async (rows: unknown) => rows,
}));
const state = vi.hoisted(() => ({ get: vi.fn(), features: vi.fn() }));
vi.mock("../services/site-features.service", () => ({ getSiteFeatures: state.features }));
vi.mock("../services/blog-publication.service", () => ({ listPublishedBlogSnapshots: state.get }));
import router from "./blog-publication-public.routes";
let server: Server, base: string;
beforeAll(async () => {
  const app = express();
  app.use("/api", router);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/website/blog-publication`;
});
afterAll(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);
beforeEach(() => {
  state.get.mockReset();
  state.features.mockResolvedValue({ cmsEnabled: true, blogEnabled: true });
  state.get.mockResolvedValue([]);
});
it("serves a public bounded projection with no-store and nosniff", async () => {
  const response = await fetch(base);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect((await response.json()).posts).toEqual([]);
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
  expect(await response.json()).toEqual({ error: "Blog publications unavailable" });
});

it("returns authoritative empty assignments when CMS is disabled without reading menus", async () => {
  state.features.mockResolvedValue({ cmsEnabled: false });
  const response = await fetch(base);
  expect(response.status).toBe(200);
  expect((await response.json()).posts).toEqual([]);
  expect(state.get).not.toHaveBeenCalled();
});
