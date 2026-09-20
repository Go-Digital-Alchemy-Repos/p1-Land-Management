import express from "express";
import { afterAll, beforeAll, beforeEach, it, expect, vi } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
const state = vi.hoisted(() => ({
  owned: undefined as undefined | { postId: string; sourceSlug: string },
  save: vi.fn(),
}));
vi.mock("../../middleware/auth", () => ({
  requireBusinessCapability: () => (req: any, _res: any, next: any) => {
    req.user = { id: "fixture" };
    next();
  },
}));
vi.mock("../../services/client-site-blog-ownership.service", () => ({
  getClientSiteBlogOwnership: async () => state.owned,
}));
vi.mock("../../storage", () => ({
  storage: { clientSiteContent: { get: async () => undefined, saveDraft: state.save } },
}));
vi.mock("../../utils/logger", () => ({ logger: { cms: { error: vi.fn() } } }));
import router from "./client-site-content.routes";
import { ClientSiteContentConflictError } from "../../services/client-site-content-workflow";
let server: Server, base: string;
beforeAll(async () => {
  vi.stubEnv("CLIENT_SITE_MANIFEST_PATH", "config/p1-client-site-manifest.json");
  const app = express();
  app.use(express.json());
  app.use(router);
  await new Promise<void>((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(() => {
  state.owned = undefined;
  state.save.mockReset();
});
const slug = "land-clearing-cost-per-acre-south-carolina";
const path = `/blog-${slug}/blog-${slug}-content`;
it("adds only permanent owner identity to the existing envelope while retaining source fields", async () => {
  const before = await (await fetch(base + path)).json();
  expect(before.ownedBlog).toBeUndefined();
  state.owned = { postId: "owned-post", sourceSlug: slug };
  const response = await fetch(base + path);
  expect(response.status).toBe(200);
  const after = await response.json();
  expect(after.ownedBlog).toEqual(state.owned);
  expect(after.draftContent).toEqual(before.draftContent);
  expect(after.component.fields).toEqual(before.component.fields);
});
it("returns actionable409 for an old editor write rejected by storage ownership fence", async () => {
  const current = await (await fetch(base + path)).json();
  state.save.mockRejectedValue(
    new ClientSiteContentConflictError(
      "This article is managed in Blog. Archived fields are read-only.",
    ),
  );
  const response = await fetch(base + path + "/draft", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedRevision: 0, content: current.draftContent }),
  });
  expect(response.status).toBe(409);
  expect((await response.json()).error).toContain("managed in Blog");
});
