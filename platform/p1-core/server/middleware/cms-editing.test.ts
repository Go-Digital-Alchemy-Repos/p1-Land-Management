import express from "express";
import { once } from "node:events";
import { afterEach, expect, test, vi } from "vitest";

// Route authorization is separately tested; this suite isolates the pause
// boundary so writes cannot reach any retained CMS handler.
vi.mock("./auth", () => ({
  requireBusinessCapability: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function request(app: express.Express, method: string, path: string) {
  const server = app.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw Error("No test port");
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("default-paused CMS blocks every page-copy write while keeping reads and plumbing", async () => {
  vi.stubEnv("P1_CMS_EDITING", "");
  vi.resetModules();
  const { cmsEditingStatus, requireCmsEditing, requireCmsEditingForContent } = await import("./cms-editing");
  expect(cmsEditingStatus).toEqual({ editing: "paused" });
  const app = express();
  app.get("/api/cms/status", (_req, res) => res.json(cmsEditingStatus));
  app.use("/api/admin/client-site-content", requireCmsEditing);
  app.use("/api/admin/blog", requireCmsEditing);
  app.use("/api/admin/cms", requireCmsEditingForContent);
  app.use("/api/integrations/business-center/cms/website", requireCmsEditing);
  app.use("/api/integrations/business-center/cms/blog", requireCmsEditing);
  app.use("/api/integrations/business-center/cms", requireCmsEditingForContent);
  app.use((_req, res) => res.json({ reachedHandler: true }));

  const blocked: Array<[string, string]> = [
    ["PUT", "/api/admin/client-site-content/home/home-content/draft"],
    ["POST", "/api/admin/client-site-content/home/home-content/publish"],
    ["POST", "/api/admin/client-site-content/home/home-content/revisions/1/restore"],
    ["POST", "/api/admin/cms/pages"], ["PUT", "/api/admin/cms/pages/id"],
    ["POST", "/api/admin/cms/pages/id/duplicate"],
    ["POST", "/api/admin/cms/pages/id/publish"],
    ["POST", "/api/admin/cms/pages/id/unpublish"],
    ["DELETE", "/api/admin/cms/pages/id"],
    ["POST", "/api/admin/cms/menus"], ["PUT", "/api/admin/cms/sidebars/id"],
    ["POST", "/api/admin/cms/sections"], ["DELETE", "/api/admin/cms/galleries/id"],
    ["POST", "/api/admin/blog"],
    ["PUT", "/api/integrations/business-center/cms/website/home/home-content/draft"],
    ["POST", "/api/integrations/business-center/cms/pages"],
    ["POST", "/api/integrations/business-center/cms/blog"],
  ];
  for (const [method, path] of blocked) {
    const result = await request(app, method, path);
    expect(result).toMatchObject({ status: 423, body: { error: "cms_paused" } });
  }
  for (const [method, path] of [
    ["GET", "/api/admin/client-site-content/home/home-content/revisions"],
    ["GET", "/api/admin/cms/pages"],
    ["POST", "/api/admin/cms/media"],
    ["POST", "/api/admin/cms/redirects"],
    ["POST", "/api/integrations/business-center/cms/forms"],
    ["POST", "/api/integrations/business-center/cms/upload"],
  ]) {
    const result = await request(app, method, path);
    expect(result).toEqual({ status: 200, body: { reachedHandler: true } });
  }
  expect((await request(app, "GET", "/api/cms/status")).body).toEqual({ editing: "paused" });
});

test("only the exact enabled value reopens CMS writes", async () => {
  vi.stubEnv("P1_CMS_EDITING", "enabled");
  vi.resetModules();
  const { cmsEditingStatus, requireCmsEditing } = await import("./cms-editing");
  expect(cmsEditingStatus).toEqual({ editing: "enabled" });
  const app = express();
  app.use(requireCmsEditing, (_req, res) => res.json({ reachedHandler: true }));
  expect(await request(app, "POST", "/publish")).toEqual({ status: 200, body: { reachedHandler: true } });
});
