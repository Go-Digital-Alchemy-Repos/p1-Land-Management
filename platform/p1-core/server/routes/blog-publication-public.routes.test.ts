import express from "express";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { Server } from "node:http";
vi.mock("../db", () => ({ db: { transaction: async (fn: (tx: object) => unknown) => fn({}) } }));
vi.mock("../services/public-blog-media.service", () => ({
  resolvePublicBlogMedia: async (rows: unknown) => rows,
}));
const state = vi.hoisted(() => ({ get: vi.fn(), features: vi.fn(), ownership: vi.fn() }));
vi.mock("../storage", () => ({ storage: { settings: { getDecryptedCategory: state.features } } }));
vi.mock("../services/blog-publication.service", () => ({ listPublishedBlogSnapshots: state.get }));
vi.mock("../services/blog-static-import-receipts.service", () => ({
  listStaticBlogRoutes: state.ownership,
}));
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
  state.ownership.mockReset();
  state.ownership.mockResolvedValue([]);
  state.features.mockReset();
  state.features.mockResolvedValue({ enable_cms: "true", enable_blog: "true" });
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

it("returns authoritative empty publications when CMS is disabled without reading posts", async () => {
  state.features.mockResolvedValue({ enable_cms: "false" });
  const response = await fetch(base);
  expect(response.status).toBe(200);
  expect((await response.json()).posts).toEqual([]);
  expect(state.get).not.toHaveBeenCalled();
});

it("keeps Blog disabled independently from CMS", async () => {
  state.features.mockResolvedValue({ enable_cms: "true", enable_blog: "false" });
  const response = await fetch(base);
  expect(response.status).toBe(200);
  expect((await response.json()).posts).toEqual([]);
  expect(state.get).not.toHaveBeenCalled();
});

it("fails unavailable rather than defaulting to enabled after a settings read failure", async () => {
  state.features.mockRejectedValue(Error("private configuration failure"));
  const response = await fetch(base);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Blog publications unavailable" });
  expect(state.get).not.toHaveBeenCalled();
});

it("retains permanent static ownership when Blog is disabled", async () => {
  state.features.mockResolvedValue({ enable_cms: "true", enable_blog: "false" });
  const ownership = [{ slug: "signs-property-drainage-problem", postId: "imported" }];
  state.ownership.mockResolvedValue(ownership);
  const response = await fetch(base);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    schemaVersion: 2,
    staticRoutes: ownership,
    posts: [],
  });
  expect(state.get).not.toHaveBeenCalled();
});
it("fails unavailable rather than treating ownership read failure as unowned", async () => {
  state.ownership.mockRejectedValue(Error("private receipt failure"));
  const response = await fetch(base);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Blog publications unavailable" });
});
