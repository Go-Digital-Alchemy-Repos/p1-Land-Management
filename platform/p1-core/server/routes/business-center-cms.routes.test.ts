import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({
  authenticate: vi.fn(),
  user: vi.fn(),
  enabled: vi.fn(),
  pages: vi.fn(),
  page: vi.fn(),
  publish: vi.fn(),
  menus: vi.fn(),
  updateMenu: vi.fn(),
  list: vi.fn(),
  websiteGet: vi.fn(),
  websiteSave: vi.fn(),
}));
vi.mock("../services/federation-runtime", () => ({
  federationConsumer: () => ({
    authenticateServiceGrant: state.authenticate,
    authenticateContext: state.authenticate,
  }),
  FEDERATION_COOKIE: "test",
  hasFederationHistory: vi.fn(),
}));
vi.mock("../storage", () => ({
  storage: {
    users: { getUser: state.user },
    clientSiteContent: { get: state.websiteGet, saveDraft: state.websiteSave },
    cmsPages: {
      getAllPages: state.pages,
      getPageByIdOrSlug: state.page,
      publishPage: state.publish,
      getPage: state.page,
    },
    cmsMenus: { getAll: state.menus, update: state.updateMenu },
    cmsSections: { getAllSections: state.list },
    cmsGalleries: { getAll: state.list },
    cmsSidebars: { getAll: state.list },
    redirects: { getAll: state.list },
    team: { list: state.list },
    seoSettings: { get: async () => ({}) },
    blog: { getAllPosts: state.list },
    events: { getAllEvents: state.list },
    forms: { getAll: state.list },
    editorLocks: { listActiveByResourceType: state.list },
  },
}));
vi.mock("../storage/index", async () => await import("../storage"));
vi.mock("../services/site-features.service", () => ({ isSiteFeatureEnabled: state.enabled }));
vi.mock("../services/system-cms-sections.service", () => ({ ensureSystemCmsSections: vi.fn() }));
import router from "./business-center-cms.routes";
import pages from "./admin/cms.routes";
import sections from "./admin/cms-sections.routes";
import galleries from "./admin/cms-galleries.routes";
import menus from "./admin/cms-menus.routes";
import sidebars from "./admin/cms-sidebars.routes";
import seo from "./admin/cms-seo.routes";
import redirects from "./admin/cms-redirects.routes";
import audit from "./admin/cms-audit.routes";
import team from "./admin/team.routes";
import media from "./admin/cms-media.routes";
import publicCms from "./cms-public.routes";
import { ClientSiteContentConflictError } from "../services/client-site-content-workflow";
const key = "s".repeat(43),
  grantId = "11111111-1111-4111-8111-111111111111";
let server: Server, base: string;
let identity: any;
beforeEach(async () => {
  vi.stubEnv("CORE_FEDERATION_ENABLED", "true");
  vi.stubEnv("DASHBOARD_MARKETING_SERVICE_KEY", key);
  identity = {
    active: true,
    role: "member",
    capabilities: ["marketing.content.pages"],
    ownerAttested: false,
  };
  state.authenticate.mockImplementation(async () => ({ userId: "linked", grant: identity }));
  state.user.mockResolvedValue({ id: "linked", role: "admin", isSuspended: false });
  state.enabled.mockResolvedValue(true);
  state.list.mockResolvedValue([]);
  state.pages.mockResolvedValue([{ id: "page", title: "Synthetic page" }]);
  state.page.mockResolvedValue({ id: "page", title: "Synthetic page", slug: "synthetic" });
  state.publish.mockResolvedValue({ id: "page", status: "published" });
  state.menus.mockResolvedValue([
    {
      id: "menu",
      name: "Main",
      location: "header",
      items: [{ id: "item", pageId: "page", label: "Synthetic page", url: "/synthetic" }],
    },
  ]);
  const app = express();
  app.use(express.json());
  app.use("/service", router);
  app.use("/public", publicCms);
  // Actual retained handlers, after the legacy mount's authentication step.
  app.use(
    "/legacy",
    (req, _res, next) => {
      req.user = { id: "linked", role: "admin" } as any;
      req.dashboardIdentity = identity;
      next();
    },
    pages,
    sections,
    galleries,
    menus,
    sidebars,
    seo,
    redirects,
    audit,
    team,
    media,
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
function request(
  path: string,
  method = "GET",
  headers: Record<string, string> = {},
  prefix = "/service",
) {
  return fetch(base + prefix + path, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      "x-p1-user-grant": grantId,
      ...headers,
    },
  });
}
it("rejects missing grants, browser-shaped requests and failed local links before CMS work", async () => {
  for (const headers of [
    { origin: "https://dashboard.example.test" },
    { cookie: "session=test" },
    { "sec-fetch-site": "same-origin" },
    { authorization: "Bearer wrong" },
  ])
    expect((await request("/pages", "GET", headers)).status).toBe(401);
  expect((await request("/pages", "GET", { "x-p1-user-grant": "" })).status).toBe(400);
  expect(state.authenticate).not.toHaveBeenCalled();
  state.user.mockResolvedValue({ id: "linked", isSuspended: true });
  expect((await request("/pages")).status).toBe(403);
  expect(state.pages).not.toHaveBeenCalled();
});
it("uses the same page handlers and original local audit identity, with fresh grants", async () => {
  const response = await request("/pages");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toEqual([{ id: "page", title: "Synthetic page" }]);
  expect((await request("/pages/page/publish", "POST")).status).toBe(200);
  expect(state.publish).toHaveBeenCalledWith("page", "linked");
  expect((await request("/menus")).status).toBe(403);
  identity.capabilities = [];
  expect((await request("/pages/page/publish", "POST")).status).toBe(403);
  expect(state.publish).toHaveBeenCalledTimes(1);
  identity.capabilities = ["marketing.content.pages"];
  state.enabled.mockResolvedValue(false);
  expect((await request("/pages")).status).toBe(404);
});
it("requires Pages and Menus to explicitly remove page links from navigation", async () => {
  expect((await request("/pages/page/relationships/remove-menu-items", "POST")).status).toBe(403);
  expect(state.menus).not.toHaveBeenCalled();
  identity.capabilities.push("marketing.content.menus");
  expect((await request("/pages/page/relationships/remove-menu-items", "POST")).status).toBe(200);
  expect(state.updateMenu).toHaveBeenCalledWith("menu", { items: [] });
});
it("fails closed for every retained route without canonical grants, including local admin", async () => {
  const endpoints: [string, string][] = [
    ["GET", "/pages"],
    ["POST", "/pages"],
    ["GET", "/pages/id"],
    ["PUT", "/pages/id"],
    ["DELETE", "/pages/id"],
    ...[
      "publish",
      "unpublish",
      "schedule",
      "duplicate",
      "relationships/remove-menu-items",
      "revisions/rev/restore",
    ].map((action) => ["POST", `/pages/id/${action}`] as [string, string]),
    ...["relationships", "preview-link", "revisions"].map(
      (action) => ["GET", `/pages/id/${action}`] as [string, string],
    ),
    ...["sections", "galleries", "menus", "sidebars", "redirects"].flatMap(
      (tool) =>
        [
          ["GET", `/${tool}`],
          ["POST", `/${tool}`],
          ["PUT", `/${tool}/id`],
          ["DELETE", `/${tool}/id`],
        ] as [string, string][],
    ),
    ...["sections", "galleries", "menus", "sidebars"].map(
      (tool) => ["GET", `/${tool}/id`] as [string, string],
    ),
    ["POST", "/sections/system/starter-library"],
    ...["publish", "unpublish", "duplicate"].map(
      (action) => ["POST", `/galleries/id/${action}`] as [string, string],
    ),
    ["GET", "/seo"],
    ["PUT", "/seo"],
    ["GET", "/seo/robots-txt"],
    ["PUT", "/seo/robots-txt"],
    ["GET", "/seo-audit"],
    ["GET", "/team"],
    ["POST", "/team"],
    ["PUT", "/team/id"],
  ];
  for (const prefix of ["/service", "/legacy"]) {
    identity = { active: true, role: "member", capabilities: [], ownerAttested: false };
    for (const [method, path] of endpoints)
      expect((await request(path, method, {}, prefix)).status, `${prefix} ${method} ${path}`).toBe(
        403,
      );
  }
  identity = undefined;
  expect((await request("/pages", "GET", {}, "/legacy")).status).toBe(403);
  expect(state.pages).not.toHaveBeenCalled();
});
it("rejects client, crew, inactive and unattested Owner identities even with page grants", async () => {
  for (const overrides of [
    { role: "client" },
    { role: "crew" },
    { active: false },
    { role: "owner", ownerAttested: false },
  ]) {
    identity = {
      active: true,
      role: "member",
      capabilities: ["marketing.content.pages"],
      ...overrides,
    };
    expect((await request("/pages")).status).toBe(403);
  }
  identity.ownerAttested = true;
  expect((await request("/pages")).status).toBe(200);
  expect((await request("/users")).status).toBe(404);
});
it("does not let Sales, Pages or reporting grants read or mutate the legacy Media library", async () => {
  identity.capabilities = ["revenue.sales", "marketing.content.pages", "marketing.analytics.view"];
  for (const [method, path] of [
    ["POST", "/upload"],
    ["GET", "/media"],
    ["GET", "/media/id/source"],
    ["PATCH", "/media/id"],
    ["POST", "/media/id/replace"],
    ["PATCH", "/media/id/alt"],
    ["DELETE", "/media/id"],
  ])
    expect((await request(path, method, {}, "/legacy")).status).toBe(403);
});
it("independently permits each CMS tool without granting its neighbors", async () => {
  for (const [tool, path] of [
    ["sections", "/sections"],
    ["galleries", "/galleries"],
    ["menus", "/menus"],
    ["sidebars", "/sidebars"],
    ["seo", "/seo"],
    ["seo", "/redirects"],
    ["seo", "/seo-audit"],
    ["team", "/team"],
  ]) {
    identity.capabilities = [`marketing.content.${tool}`];
    expect((await request(path)).status, path).toBe(200);
    expect((await request("/pages")).status).toBe(403);
  }
});
it("requires Pages on the authenticated public preview route before reading a draft", async () => {
  identity.capabilities = ["marketing.content.seo"];
  expect((await request("/pages/preview/page?token=invalid", "GET", {}, "/public")).status).toBe(
    403,
  );
  expect(state.page).not.toHaveBeenCalled();
  identity.capabilities = ["marketing.content.pages"];
  expect((await request("/pages/preview/page?token=invalid", "GET", {}, "/public")).status).toBe(
    404,
  );
  expect(state.page).toHaveBeenCalledWith("page");
});
it("exposes resource-scoped lock reads through the confidential service boundary", async () => {
  expect((await request("/editor-locks/resource/cms_page")).status).toBe(200);
  expect((await request("/editor-locks/resource/cms_menu")).status).toBe(403);
  expect((await request("/editor-locks/resource/doc")).status).toBe(403);
  identity = { active: true, role: "owner", ownerAttested: true, capabilities: [] };
  state.enabled.mockResolvedValue(false);
  expect((await request("/editor-locks/resource/doc")).status).toBe(200);
  identity.ownerAttested = false;
  expect((await request("/editor-locks/resource/doc")).status).toBe(403);
});
it("projects menu selector references without page bodies, form rules or submissions", async () => {
  identity.capabilities = ["marketing.content.menus"];
  state.pages.mockResolvedValue([
    {
      id: "page",
      title: "About",
      slug: "about",
      status: "draft",
      content: { private: "draft body" },
    },
  ]);
  state.list.mockResolvedValue([
    {
      id: "form",
      name: "Estimate",
      slug: "estimate",
      notificationEmails: ["private@example.test"],
      fields: [{ secret: true }],
    },
  ]);
  const response = await request("/menu-references");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    pages: [{ id: "page", title: "About", slug: "about", status: "draft" }],
    forms: [{ id: "form", name: "Estimate", slug: "estimate" }],
  });
  identity.capabilities = ["marketing.content.pages"];
  expect((await request("/menu-references")).status).toBe(403);
});

it("bridges Website content with its own grant, bounded validation and revision conflicts", async () => {
  vi.stubEnv("CLIENT_SITE_MANIFEST_PATH", "docs/pilots/better-farms/client-site-manifest.example.json");
  const path = "/website/fund-a-farm/fund-a-farm-page";
  expect((await request(path)).status).toBe(403);
  expect(state.websiteGet).not.toHaveBeenCalled();
  identity.capabilities = ["marketing.content.website"];
  state.websiteGet.mockResolvedValue(undefined);
  const catalog = await request("/website");
  expect(catalog.status).toBe(200);
  expect((await catalog.json()).some((row: any) => row.routeId === "fund-a-farm")).toBe(true);
  const response = await request(path);
  expect(response.status).toBe(200);
  const detail = await response.json();
  expect(detail.previewUrl).toBe("https://better-farms.example/fund-a-farm?cmsPreview=1&cmsComponent=fund-a-farm-page");
  const save = (body: unknown) => fetch(base + "/service" + path + "/draft", {
    method: "PUT", headers: { authorization: `Bearer ${key}`, "x-p1-user-grant": grantId, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  expect((await save({ content: detail.draftContent, expectedRevision: -1 })).status).toBe(400);
  expect(state.websiteSave).not.toHaveBeenCalled();
  state.websiteSave.mockRejectedValue(new ClientSiteContentConflictError("Draft revision changed"));
  const conflict = await save({ content: detail.draftContent, expectedRevision: 0 });
  expect(conflict.status).toBe(409);
  expect(await conflict.json()).toEqual({ error: "Draft revision changed" });
  expect(state.websiteSave).toHaveBeenCalledWith(expect.any(Object), detail.draftContent, 0, "linked");
  identity.capabilities = [];
  expect((await save({ content: detail.draftContent, expectedRevision: 0 })).status).toBe(403);
  expect(state.websiteSave).toHaveBeenCalledTimes(1);
});
