import express from "express";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { Server } from "node:http";
const calls = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  adopt: vi.fn(),
  revisions: vi.fn(),
  preview: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock("../../services/blog-publication-editor.service", () => ({
  listBlogPublications: calls.list,
  getBlogPublication: calls.get,
  createBlogPublication: calls.create,
  adoptBlogPublication: calls.adopt,
  blogRevisionSummaries: calls.revisions,
  previewBlogRevision: calls.preview,
}));
vi.mock("../../services/blog-publication.service", () => ({ mutateBlogPublication: calls.mutate }));
import router from "./blog-publications.routes";
import { errorHandler } from "../../middleware/error-handler";
let server: Server, base: string, actor: any, grant: any;
beforeEach(async () => {
  Object.values(calls).forEach((fn) => fn.mockReset());
  calls.list.mockResolvedValue([]);
  calls.preview.mockResolvedValue({
    id: "post",
    revisionId: "rev",
    snapshot: { content: "<p>Safe</p>" },
  });
  actor = { id: "user", role: "admin" };
  grant = {
    active: true,
    role: "member",
    capabilities: ["marketing.content.blog"],
    ownerAttested: false,
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = actor;
    req.dashboardIdentity = grant;
    next();
  });
  app.use(router);
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
it("requires signed-in authorized Blog capability for private reads", async () => {
  actor = undefined;
  expect((await fetch(base)).status).toBe(401);
  actor = { id: "user", role: "admin" };
  grant.capabilities = [];
  expect((await fetch(base)).status).toBe(403);
  expect(calls.list).not.toHaveBeenCalled();
});
it("marks all successful private reads no-store and noindex", async () => {
  const result = await fetch(base);
  expect(result.status).toBe(200);
  expect(result.headers.get("cache-control")).toBe("private, no-store");
  expect(result.headers.get("x-robots-tag")).toContain("noindex");
});
it("rejects unknown/empty/oversized preview query and accepts a bounded revision", async () => {
  for (const query of ["?draft=true", "?revisionId=", "?revisionId=" + "a".repeat(161)])
    expect((await fetch(base + "/post/preview" + query)).status).toBe(400);
  expect(calls.preview).not.toHaveBeenCalled();
  expect((await fetch(base + "/post/preview?revisionId=rev-1")).status).toBe(200);
  expect(calls.preview).toHaveBeenCalledWith("post", "rev-1");
});
it("rejects missing mutation proof before invoking service", async () => {
  const result = await fetch(base + "/post/actions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "publish" }),
  });
  expect(result.status).toBe(400);
  expect(calls.mutate).not.toHaveBeenCalled();
});
it("does not let a media-only grant read previews or perform adoption", async () => {
  grant.capabilities = ["marketing.content.media"];
  expect((await fetch(base + "/post/preview")).status).toBe(403);
  expect(
    (
      await fetch(base + "/post/adopt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    ).status,
  ).toBe(403);
  expect(calls.adopt).not.toHaveBeenCalled();
});
