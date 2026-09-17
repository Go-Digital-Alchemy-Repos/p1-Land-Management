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
  seoGet: vi.fn(),
  seoSave: vi.fn(),
  blogCreate: vi.fn(),
  blogUpdate: vi.fn(),
  blogGet: vi.fn(),
  blogDelete: vi.fn(),
  taxonomies: vi.fn(),
  taxonomyGet: vi.fn(),
  taxonomyCreate: vi.fn(),
  taxonomyUpdate: vi.fn(),
  taxonomyDelete: vi.fn(),
  renameCategories: vi.fn(),
  renameTags: vi.fn(),
  clearParent: vi.fn(),
  comments: vi.fn(),
  commentUpdate: vi.fn(),
  commentStatus: vi.fn(),
  commentDelete: vi.fn(),
  commentSettings: vi.fn(),
  saveCommentSettings: vi.fn(),
  websiteGet: vi.fn(),
  websiteSave: vi.fn(),
  mediaGet: vi.fn(),
  mediaCreate: vi.fn(),
  mediaDownload: vi.fn(),
  teamCreate: vi.fn(),
  teamUpdate: vi.fn(),
  activity: vi.fn(),
  form: vi.fn(),
  formSlug: vi.fn(),
  formCreate: vi.fn(),
  formUpdate: vi.fn(),
  formDelete: vi.fn(),
  formSubmissions: vi.fn(),
  formDeleteSubmission: vi.fn(),
  formJobs: vi.fn(),
  formRetry: vi.fn(),
  eventUpdate: vi.fn(),
  attendees: vi.fn(), attendance: vi.fn(),
  events: vi.fn(), eventGet: vi.fn(), eventCreate: vi.fn(), eventSlug: vi.fn(), eventMail: vi.fn(), venues:vi.fn(), organizers:vi.fn(), eventAnalytics:vi.fn(),
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
    cmsMedia: { getMedia: state.mediaGet },
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
    team: { list: state.list, create: state.teamCreate, update: state.teamUpdate },
    activity: { log: state.activity },
    seoSettings: { get: state.seoGet, upsert: state.seoSave },
    blog: {
      getAllPosts: state.list,
      getPost: state.blogGet,
      createPost: state.blogCreate,
      updatePost: state.blogUpdate,
      deletePost: state.blogDelete,
      renameCategoryReferences: state.renameCategories,
      renameTagReferences: state.renameTags,
    },
    blogTaxonomies: {
      getAllTaxonomies: state.taxonomies,
      getTaxonomy: state.taxonomyGet,
      createTaxonomy: state.taxonomyCreate,
      updateTaxonomy: state.taxonomyUpdate,
      deleteTaxonomy: state.taxonomyDelete,
      clearParent: state.clearParent,
    },
    blogComments: {
      getCommentsForModeration: state.comments,
      updateComment: state.commentUpdate,
      updateCommentStatus: state.commentStatus,
      deleteComment: state.commentDelete,
      countByStatus: async () => ({ pending: 0, approved: 0, spam: 0, rejected: 0 }),
    },
    events: {updateEvent:state.eventUpdate,getAllEvents:state.events,getEvent:state.eventGet,createEvent:state.eventCreate,getEventSlugOwner:state.eventSlug},
    eventVenues:{getAllVenues:state.venues},
    eventOrganizers:{getAllOrganizers:state.organizers},
    eventRegistrations:{getEventAnalytics:state.eventAnalytics,getRegistrationsByEvent:state.attendees,setEventAttendance:state.attendance},
    forms: { getAll: state.list, getById: state.form, getBySlug: state.formSlug, create: state.formCreate, update: state.formUpdate, updateIfUnchanged: state.formUpdate, delete: state.formDelete, getSubmissionsByFormId: state.formSubmissions, deleteSubmission: state.formDeleteSubmission, listDeliveryJobs: state.formJobs, requeueFailedEffectJob: state.formRetry },
    editorLocks: { listActiveByResourceType: state.list },
  },
}));
vi.mock("../services/email.service", () => ({sendEventCanceledEmail:state.eventMail,sendEventReminderEmail:state.eventMail,sendRecordingAvailableEmail:state.eventMail}));
vi.mock("../services/commercial-backfill.service", () => ({ backfillCommercialInquiries: vi.fn() }));
vi.mock("../storage/index", async () => await import("../storage"));
vi.mock("../services/site-features.service", () => ({ isSiteFeatureEnabled: state.enabled }));
vi.mock("../services/system-cms-sections.service", () => ({ ensureSystemCmsSections: vi.fn() }));
vi.mock("../services/cms-media-upload.service", async (original) => ({
  ...(await original<typeof import("../services/cms-media-upload.service")>()),
  createCmsMediaAssetFromUpload: state.mediaCreate,
}));
vi.mock("../services/r2.service", () => ({
  downloadFile: state.mediaDownload,
  normalizePublicUrl: async (value: unknown) => value,
}));
vi.mock("../services/blog-comments.service", () => ({
  getBlogCommentSettings: state.commentSettings,
  saveBlogCommentSettings: state.saveCommentSettings,
}));
import blog from "./admin/blog.routes";
import { errorHandler } from "../middleware/error-handler";
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
  state.events.mockResolvedValue([]);
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
    express.Router().use("/blog", blog),
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
  app.use(errorHandler);
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
  body?: unknown,
) {
  return fetch(base + prefix + path, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      "x-p1-user-grant": grantId,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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
    for (const prefix of ["/legacy", "/service"])
      expect((await request(path, method, {}, prefix)).status).toBe(403);
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
  vi.stubEnv(
    "CLIENT_SITE_MANIFEST_PATH",
    "docs/pilots/better-farms/client-site-manifest.example.json",
  );
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
  expect(detail.previewUrl).toBe(
    "https://better-farms.example/fund-a-farm?cmsPreview=1&cmsComponent=fund-a-farm-page",
  );
  const save = (body: unknown) =>
    fetch(base + "/service" + path + "/draft", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${key}`,
        "x-p1-user-grant": grantId,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  expect((await save({ content: detail.draftContent, expectedRevision: -1 })).status).toBe(400);
  expect(state.websiteSave).not.toHaveBeenCalled();
  state.websiteSave.mockRejectedValue(new ClientSiteContentConflictError("Draft revision changed"));
  const conflict = await save({ content: detail.draftContent, expectedRevision: 0 });
  expect(conflict.status).toBe(409);
  expect(await conflict.json()).toEqual({ error: "Draft revision changed" });
  expect(state.websiteSave).toHaveBeenCalledWith(
    expect.any(Object),
    detail.draftContent,
    0,
    "linked",
  );
  identity.capabilities = [];
  expect((await save({ content: detail.draftContent, expectedRevision: 0 })).status).toBe(403);
  expect(state.websiteSave).toHaveBeenCalledTimes(1);
});

it("requires Media authority before parsing multipart uploads and source requests", async () => {
  identity.capabilities = ["marketing.content.media"];
  expect((await request("/upload", "POST")).status).toBe(400);
  identity.capabilities = [];
  const body = new FormData();
  body.set("file", new Blob(["synthetic"], { type: "image/png" }), "photo.png");
  expect(
    (
      await fetch(base + "/service/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "x-p1-user-grant": grantId },
        body,
      })
    ).status,
  ).toBe(403);
});

it("runs retained multipart and source handlers through the authenticated service", async () => {
  identity.capabilities = ["marketing.content.media"];
  state.mediaCreate.mockResolvedValue({ id: "asset", mimeType: "image/png" });
  const body = new FormData();
  body.set("file", new Blob(["synthetic bytes"], { type: "image/png" }), "photo.png");
  const result = await fetch(base + "/service/upload", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "x-p1-user-grant": grantId },
    body,
  });
  expect(result.status).toBe(201);
  expect(state.mediaCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      originalName: "photo.png",
      mimeType: "image/png",
      uploadedBy: "linked",
      buffer: Buffer.from("synthetic bytes"),
    }),
  );
  state.mediaGet.mockResolvedValue({ id: "asset", r2Key: "synthetic-key", mimeType: "image/png" });
  state.mediaDownload.mockResolvedValue({
    buffer: Buffer.from([0, 1, 255]),
    contentType: "image/png",
  });
  const source = await request("/media/asset/source");
  expect(source.status).toBe(200);
  expect(source.headers.get("content-type")).toBe("image/png");
  expect(Buffer.from(await source.arrayBuffer())).toEqual(Buffer.from([0, 1, 255]));
  expect(state.mediaDownload).toHaveBeenCalledWith("synthetic-key");
});

it("Team service writes retain local audit identity and require independent Team access", async () => {
  const body = {
    name: "Synthetic member",
    role: "Field lead",
    biography: "<p>Biography</p>",
    excerpt: "",
    photoUrl: "",
    photoAlt: "",
    status: "draft",
  };
  const write = (path: string, method: string, input: unknown) =>
    fetch(base + "/service" + path, {
      method,
      headers: {
        authorization: `Bearer ${key}`,
        "x-p1-user-grant": grantId,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
  identity.capabilities = ["marketing.content.team"];
  state.teamCreate.mockResolvedValue({ ...body, id: "member" });
  state.teamUpdate.mockResolvedValue({ ...body, id: "member", status: "archived" });
  expect((await write("/team", "POST", body)).status).toBe(201);
  expect(state.teamCreate).toHaveBeenCalledWith(body, "linked");
  expect(state.activity).toHaveBeenCalledWith("linked", "team_member_created", "member");
  expect((await write("/team/member", "PUT", { ...body, status: "archived" })).status).toBe(200);
  expect(state.teamUpdate).toHaveBeenCalledWith(
    "member",
    { ...body, status: "archived" },
    "linked",
  );
  identity.capabilities = ["settings.people.manage", "marketing.content.media"];
  expect((await write("/team", "POST", body)).status).toBe(403);
  expect((await write("/team/member", "PUT", body)).status).toBe(403);
  expect(state.teamCreate).toHaveBeenCalledTimes(1);
  expect(state.teamUpdate).toHaveBeenCalledTimes(1);
});

it("requires Blog access on every retained post, taxonomy and moderation operation", async () => {
  identity.capabilities = ["marketing.content.pages", "marketing.content.media", "revenue.sales"];
  for (const [method, path] of [
    ["GET", "/blog"],
    ["POST", "/blog"],
    ["GET", "/blog/post"],
    ["PUT", "/blog/post"],
    ["DELETE", "/blog/post"],
    ["GET", "/blog/references"],
    ["GET", "/blog/settings/taxonomies"],
    ["POST", "/blog/settings/taxonomies"],
    ["PUT", "/blog/settings/taxonomies/category"],
    ["DELETE", "/blog/settings/taxonomies/category"],
    ["GET", "/blog/settings/comments"],
    ["PUT", "/blog/settings/comments"],
    ["GET", "/blog/comments"],
    ["PATCH", "/blog/comments/comment/status"],
    ["PUT", "/blog/comments/comment"],
    ["DELETE", "/blog/comments/comment"],
  ])
    for (const prefix of ["/service", "/legacy"])
      expect((await request(path, method, {}, prefix)).status).toBe(403);
  expect(state.blogCreate).not.toHaveBeenCalled();
  expect(state.comments).not.toHaveBeenCalled();
  expect(state.taxonomies).not.toHaveBeenCalled();
});
it("retains Blog scheduling rules, feature isolation and minimized references", async () => {
  identity.capabilities = ["marketing.content.blog"];
  state.enabled.mockImplementation(async (feature: string) => feature === "blogEnabled");
  state.taxonomies.mockResolvedValue([]);
  state.blogCreate.mockImplementation(async (data) => ({ ...data, id: "post" }));
  const write = (body: unknown) =>
    fetch(base + "/service/blog", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "x-p1-user-grant": grantId,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  const input = {
    title: "Synthetic post",
    slug: "synthetic-post",
    content: "<p>Post</p>",
    authorName: "Synthetic author",
    isPublished: true,
    scheduledAt: "2099-01-01T10:00:00Z",
  };
  const result = await write(input);
  expect(result.status).toBe(201);
  expect((await result.json()).isPublished).toBe(false);
  expect(state.blogCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      isPublished: false,
      publishedAt: null,
      scheduledAt: new Date(input.scheduledAt),
    }),
  );
  expect((await write({ ...input, scheduledAt: "2000-01-01T00:00:00Z" })).status).toBe(400);
  state.list.mockResolvedValue([
    { id: "sidebar", name: "News", content: { private: "not returned" } },
  ]);
  state.list.mockResolvedValueOnce([{id:"sidebar",name:"News",content:"private"}]).mockResolvedValueOnce([{id:"live",title:"Field work",status:"published",images:["private"]},{id:"draft",title:"Not published",status:"draft"}]);
  const refs = await request("/blog/references");
  expect(await refs.json()).toEqual({ sidebars: [{ id: "sidebar", name: "News" }], galleries: [{id:"live",title:"Field work"}] });
  expect((await request("/sidebars")).status).toBe(404);
  state.enabled.mockResolvedValue(false);
  expect((await request("/blog")).status).toBe(404);
});
it("retains Blog moderation filters and category conflicts without broader settings access", async () => {
  identity.capabilities = ["marketing.content.blog"];
  state.comments.mockResolvedValue([
    { id: "comment", body: "Synthetic comment", status: "pending" },
  ]);
  expect((await request("/blog/comments?status=pending")).status).toBe(200);
  expect(state.comments).toHaveBeenCalledWith("pending");
  expect((await request("/blog/comments?status=unknown")).status).toBe(400);
  state.taxonomies.mockResolvedValue([
    { id: "category", type: "category", name: "News", slug: "news" },
  ]);
  const headers = {
    authorization: `Bearer ${key}`,
    "x-p1-user-grant": grantId,
    "content-type": "application/json",
  };
  expect(
    (
      await fetch(base + "/service/blog/settings/taxonomies", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "News", type: "category" }),
      })
    ).status,
  ).toBe(409);
  state.commentStatus.mockResolvedValue({ id: "comment", status: "approved" });
  expect(
    (
      await fetch(base + "/service/blog/comments/comment/status", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "approved", moderationNote: "Reviewed" }),
      })
    ).status,
  ).toBe(200);
  expect(state.commentStatus).toHaveBeenCalledWith("comment", "approved", "Reviewed");
});

it("allows explicitly clearing a Blog category parent while preserving omitted parents",async()=>{
 identity.capabilities=["marketing.content.blog"];
 const existing={id:"child",name:"Child",slug:"child",type:"category",parentId:"parent",sortOrder:2};
 state.taxonomyGet.mockResolvedValue(existing);state.taxonomies.mockResolvedValue([existing]);state.taxonomyUpdate.mockImplementation(async(id,data)=>({id,...data}));
 const update=(body:unknown)=>fetch(base+"/service/blog/settings/taxonomies/child",{method:"PUT",headers:{authorization:`Bearer ${key}`,"x-p1-user-grant":grantId,"content-type":"application/json"},body:JSON.stringify(body)});
 expect((await update({sortOrder:3})).status).toBe(200);expect(state.taxonomyUpdate).toHaveBeenLastCalledWith("child",expect.objectContaining({parentId:"parent",sortOrder:3}));
 expect((await update({parentId:null})).status).toBe(200);expect(state.taxonomyUpdate).toHaveBeenLastCalledWith("child",expect.objectContaining({parentId:null}));
});

it("rejects descendant category parents before persisting a cycle", async () => {
 identity.capabilities=["marketing.content.blog"];
 const parent={id:"parent",name:"Parent",slug:"parent",type:"category",parentId:null,sortOrder:0};
 state.taxonomyGet.mockResolvedValue(parent);
 state.taxonomies.mockResolvedValue([parent,{...parent,id:"child",name:"Child",parentId:"parent"}]);
 const response=await fetch(base+"/service/blog/settings/taxonomies/parent",{method:"PUT",headers:{authorization:`Bearer ${key}`,"x-p1-user-grant":grantId,"content-type":"application/json"},body:JSON.stringify({parentId:"child"})});
 expect(response.status).toBe(400);expect(state.taxonomyUpdate).not.toHaveBeenCalled();
});

it("preserves SEO robots reset semantics and minimizes the audit without content grants", async()=>{
 identity.capabilities=["marketing.content.seo"];
 state.seoGet.mockResolvedValue({siteName:"P1",customRobotsTxt:null});
 state.seoSave.mockImplementation(async(data)=>({siteName:"P1",...data}));
 const write=(body:unknown)=>fetch(base+"/service/seo/robots-txt",{method:"PUT",headers:{authorization:`Bearer ${key}`,"x-p1-user-grant":grantId,"content-type":"application/json"},body:JSON.stringify(body)});
 let result=await write({customContent:"User-agent: *\nDisallow: /private  "});
 expect(result.status).toBe(200);expect((await result.json()).customContent).toBe("User-agent: *\nDisallow: /private\n");
 result=await write({customContent:null});const reset=await result.json();expect(reset.customContent).toBeNull();expect(reset.effectiveContent).toBe(reset.generatedContent);
 state.pages.mockResolvedValue([{id:"page",title:"Example",slug:"example",status:"draft",content:"private body",seoTitle:null,seoDescription:null}]);state.list.mockResolvedValue([]);
 const auditResult=await request("/seo-audit");expect(auditResult.status).toBe(200);const auditData=await auditResult.json();expect(auditData.pages[0].issues).toContain("missing_seo_title");expect(auditData.pages[0]).not.toHaveProperty("content");
 expect((await request("/pages")).status).toBe(403);
 identity.capabilities=[];expect((await write({customContent:null})).status).toBe(403);expect((await request("/seo-audit")).status).toBe(403);
});

it("minimizes Sidebar form selectors and independently gates them", async()=>{
 identity.capabilities=["marketing.content.sidebars"];
 state.list.mockResolvedValue([{id:"form",name:"Contact",slug:"contact",kind:"contact",fields:[{private:true}],notificationRecipients:["private@example.test"]}]);
 const result=await request("/sidebar-references");expect(result.status).toBe(200);expect(await result.json()).toEqual({forms:[{id:"form",name:"Contact",slug:"contact",kind:"contact"}]});
 identity.capabilities=["marketing.content.menus"];expect((await request("/sidebar-references")).status).toBe(403);
 expect((await request("/sidebar-references","GET",{},"/legacy")).status).toBe(403);
});

it("rejects gallery slugs that normalize to empty or separators before storage", async()=>{
 identity.capabilities=["marketing.content.galleries"];
 for(const slug of ["!!!","/","---"]){
 const response=await fetch(base+"/service/galleries",{method:"POST",headers:{authorization:`Bearer ${key}`,"x-p1-user-grant":grantId,"content-type":"application/json"},body:JSON.stringify({title:"Gallery",slug,status:"draft",layout:"grid",settings:{},items:[]})});
 expect(response.status).toBe(400);expect((await response.json()).message).toBe("Slug must contain letters or numbers");
 }
});

it("exposes shared Section block definitions with minimal independent selectors", async()=>{
 identity.capabilities=["marketing.content.sections"];
 state.pages.mockResolvedValue([{id:"page",title:"Page",slug:"page",status:"draft",content:"private body"}]);
 state.list.mockResolvedValueOnce([{id:"form",name:"Form",slug:"contact",kind:"contact",fields:["private"]}]).mockResolvedValueOnce([{id:"gallery",title:"Gallery",status:"published",items:["private"]},{id:"draft-gallery",title:"Draft",status:"draft"}]).mockResolvedValueOnce([{id:"team",name:"Person",status:"published",biography:"private"},{id:"draft-team",name:"Draft",status:"draft"}]);
 const response=await request("/section-builder");expect(response.status).toBe(200);const data=await response.json();
 expect(data.blocks.some((block:any)=>block.type==="hero"&&block.propDefs.length>0)).toBe(true);
 expect(data.aliases["cta-banner"]).toBe("cta");
 expect(data.pages).toEqual([{id:"page",title:"Page",slug:"page",status:"draft"}]);expect(data.forms).toEqual([{id:"form",name:"Form",slug:"contact",kind:"contact"}]);expect(data.galleries).toEqual([{id:"gallery",title:"Gallery"}]);expect(data.team).toEqual([{id:"team",name:"Person"}]);
 expect((await request("/pages")).status).toBe(403);expect((await request("/team")).status).toBe(403);
 identity.capabilities=[];expect((await request("/section-builder")).status).toBe(403);expect((await request("/section-builder","GET",{},"/legacy")).status).toBe(403);
});

it("exposes the configured preview URL only when the isolated renderer is enabled", async () => {
  identity.capabilities = ["marketing.content.sections"];
  vi.stubEnv("CORE_BUILDER_PREVIEW_ENABLED", "false");
  expect((await (await request("/section-builder")).json()).previewUrl).toBeNull();
  vi.stubEnv("CORE_BUILDER_PREVIEW_ENABLED", "true");
  vi.stubEnv("APP_URL", "https://core.example.test");
  vi.stubEnv("DASHBOARD_FEDERATION_ISSUER", "https://dashboard.example.test");
  vi.stubEnv("CORE_FEDERATION_CLIENT_ID", "preview-test");
  vi.stubEnv("CORE_FEDERATION_CLIENT_SECRET_CURRENT", "s".repeat(43));
  const response = await request("/section-builder");
  expect(response.status).toBe(200);
  expect((await response.json()).previewUrl).toBe("https://core.example.test/cms-preview/builder");
});

it("provides Pages builder selectors without granting access to related managers", async () => {
  identity.capabilities = ["marketing.content.pages"];
  state.pages.mockResolvedValue([{id:"page",title:"Page",slug:"page",status:"draft",content:{private:true}}]);
  state.list.mockResolvedValueOnce([{id:"form",name:"Form",slug:"form",kind:"contact",fields:["private"]}])
    .mockResolvedValueOnce([{id:"gallery",title:"Gallery",status:"published",items:["private"]}])
    .mockResolvedValueOnce([{id:"person",name:"Person",status:"published",biography:"private"}])
    .mockResolvedValueOnce([{id:"sidebar",name:"Sidebar",isDefault:true,widgets:["private"]}]);
  const response = await request("/page-builder");
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.sidebars).toEqual([{id:"sidebar",name:"Sidebar",isDefault:true}]);
  expect(data.forms).toEqual([{id:"form",name:"Form",slug:"form",kind:"contact"}]);
  expect(JSON.stringify(data.pages)).not.toContain("private");
  expect(JSON.stringify(data.galleries)).not.toContain("private");
  expect(JSON.stringify(data.team)).not.toContain("private");
  expect((await request("/section-builder")).status).toBe(403);
  expect((await request("/sidebars")).status).toBe(403);
  identity.capabilities = [];
  expect((await request("/page-builder")).status).toBe(403);
});

it("reserves the isolated renderer and rejects rooted reserved page slugs before storage writes", async () => {
  identity.capabilities = ["marketing.content.pages"];
  for (const slug of ["cms-preview/builder", "/cms-preview/builder", "//admin/users", "/api/private"]) {
    const response = await fetch(base + "/service/pages", {
      method: "POST", headers: { authorization: `Bearer ${key}`, "x-p1-user-grant": grantId, "content-type": "application/json" },
      body: JSON.stringify({title:"Collision", slug}),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({error:"This route is reserved"});
  }
});


it("exposes only notification form references to an attested active Owner", async () => {
  const form = { id: "form", name: "Estimate", slug: "p1-estimate", isActive: false, isSystem: true, fields: [{ private: true }], settings: { recipients: ["private@example.test"] } };
  state.list.mockResolvedValue([form]);
  for (const grant of [
    { active: true, role: "member", ownerAttested: false, capabilities: ["marketing.content.forms"] },
    { active: true, role: "owner", ownerAttested: false, capabilities: [] },
    { active: false, role: "owner", ownerAttested: true, capabilities: [] },
  ]) {
    identity = grant;
    expect((await request("/notification-forms")).status).toBe(403);
  }
  expect(state.list).not.toHaveBeenCalled();
  identity = { active: true, role: "owner", ownerAttested: true, capabilities: [] };
  const response = await request("/notification-forms");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ items: [{ id: "form", name: "Estimate", slug: "p1-estimate", isActive: false, isSystem: true }] });
});


it("gates Forms reads and preserves system form identity against mutation bypass", async () => {
  expect((await request("/forms")).status).toBe(403);
  expect(state.list).not.toHaveBeenCalled();
  identity.capabilities = ["marketing.content.forms"];
  expect((await request("/forms")).status).toBe(200);
  state.form.mockResolvedValue({ id: "system", name: "Estimate", slug: "p1-estimate", kind: "custom", isSystem: true });
  state.formSlug.mockResolvedValue(undefined);
  state.formUpdate.mockImplementation(async (_id, data) => ({ id: "system", ...data }));
  const payload = { expectedUpdatedAt: null, name: "Updated", slug: "p1-estimate", kind: "custom", isSystem: true, fields: [], settings: {} };
  expect((await request("/forms", "POST", {}, "/service", payload)).status).toBe(400);
  expect((await request("/forms/system", "PUT", {}, "/service", { ...payload, isSystem: false })).status).toBe(409);
  expect((await request("/forms/system", "PUT", {}, "/service", { ...payload, slug: "renamed" })).status).toBe(409);
  expect((await request("/forms/system", "PUT", {}, "/service", payload)).status).toBe(200);
  expect(state.formUpdate).toHaveBeenCalledTimes(1);
  expect(state.formUpdate.mock.calls[0][2]).toBeNull();
  state.formUpdate.mockResolvedValueOnce(undefined);
  expect((await request("/forms/system", "PUT", {}, "/service", payload)).status).toBe(409);
  const {expectedUpdatedAt:_, ...missingVersion}=payload;
  expect((await request("/forms/system", "PUT", {}, "/service", missingVersion)).status).toBe(400);
  expect((await request("/forms/system", "DELETE")).status).toBe(400);
  expect(state.formDelete).not.toHaveBeenCalled();
  state.formSubmissions.mockResolvedValue([{ id: "receipt", formId: "system", data: { message: "Synthetic" } }]);
  expect((await request("/forms/system/submissions")).status).toBe(200);
  expect((await request("/form-delivery-jobs/commercial-backfill", "POST", {}, "/service", {})).status).toBe(403);
});

it("provides form preview configuration only with the Forms capability", async () => {
  identity.capabilities=["marketing.content.forms"];
  const response=await request("/form-builder");
  expect(response.status).toBe(200);
  expect(Object.keys(await response.json())).toEqual(["previewUrl"]);
  identity.capabilities=["marketing.content.pages"];
  expect((await request("/form-builder")).status).toBe(403);
});


it("bridges Events with its own feature and capability boundaries", async () => {
  identity.capabilities=["marketing.content.events"];
  state.enabled.mockImplementation(async feature=>feature==="eventsEnabled");
  state.events.mockResolvedValue([{id:"event",title:"Workshop",imageUrl:null}]);
  state.eventGet.mockResolvedValue({id:"event",title:"Workshop",imageUrl:null});
  state.venues.mockResolvedValue([{id:"venue",name:"Field"}]);
  state.organizers.mockResolvedValue([{id:"organizer",name:"P1",imageUrl:null}]);
  state.eventAnalytics.mockResolvedValue({total:2});
  state.eventSlug.mockResolvedValue(undefined);
  state.eventCreate.mockImplementation(async data=>({id:"new",...data}));
  for(const path of ["/events","/events/event","/events/venues","/events/organizers","/events/event/analytics"])expect((await request(path)).status).toBe(200);
  expect((await request("/events","POST",{},"/service",{title:"Draft workshop",date:"2026-10-01T12:00:00Z",status:"draft"})).status).toBe(201);
  expect(state.eventCreate.mock.calls[0][0].date).toBeInstanceOf(Date);
  identity.capabilities=["marketing.content.pages"];
  for(const [path,method] of [["/events","GET"],["/events","POST"],["/events/event","GET"],["/events/event","PUT"],["/events/event","DELETE"],["/events/event/notify","POST"],["/events/event/duplicate","POST"],["/events/venues","GET"],["/events/venues/venue","DELETE"],["/events/organizers","POST"]])expect((await request(path,method)).status).toBe(403);
  expect(state.eventMail).not.toHaveBeenCalled();
  identity.capabilities=["marketing.content.events"];state.enabled.mockResolvedValue(false);
  expect((await request("/events")).status).toBe(404);
});


it("limits event attendance to event-scoped updates and minimizes returned identity data", async () => {
  const row = {id:"attendee",eventId:"event",fullName:"Synthetic",email:"test@example.test",phone:null,status:"confirmed",paymentStatus:"paid",notes:null,attended:false,checkedInAt:null,registeredAt:null,canceledAt:null,userId:"private-user",paymentIntentId:"private-payment",stripeCheckoutSessionId:"private-checkout",amountPaid:500};
  state.eventGet.mockResolvedValue({id:"event"});state.attendees.mockResolvedValue([row]);state.attendance.mockResolvedValue({...row,attended:true});
  expect((await request("/events/event/attendees")).status).toBe(403);
  expect((await request("/events/event/attendees/attendee/checkin","PUT",{},"/service",{attended:true})).status).toBe(403);
  expect(state.attendance).not.toHaveBeenCalled();expect(state.attendees).not.toHaveBeenCalled();
  identity.capabilities=["marketing.content.events"];
  state.enabled.mockImplementation(async feature=>feature==="eventsEnabled");
  const response=await request("/events/event/attendees");expect(response.status).toBe(200);
  const [dto]=await response.json();expect(dto.fullName).toBe("Synthetic");
  for(const field of ["userId","paymentIntentId","stripeCheckoutSessionId","amountPaid"])expect(dto).not.toHaveProperty(field);
  for(const body of [{attended:"true"},{},{attended:true,paymentStatus:"paid"}])expect((await request("/events/event/attendees/attendee/checkin","PUT",{},"/service",body)).status).toBe(400);
  const update=await request("/events/event/attendees/attendee/checkin","PUT",{},"/service",{attended:true});expect(update.status).toBe(200);expect(await update.json()).toMatchObject({attended:true,paymentStatus:"paid"});
  expect(state.attendance).toHaveBeenCalledExactlyOnceWith("event","attendee",true);
  expect(state.activity).toHaveBeenCalledWith("linked","event_attendance_updated","attendee");
  state.attendance.mockResolvedValue(undefined);
  expect((await request("/events/other/attendees/attendee/checkin","PUT",{},"/service",{attended:false})).status).toBe(404);
  state.eventGet.mockResolvedValue(undefined);expect((await request("/events/missing/attendees")).status).toBe(404);
  state.enabled.mockResolvedValue(false);expect((await request("/events/event/attendees")).status).toBe(404);
});


it("provides minimized public form references and validates event registration settings", async () => {
  identity.capabilities=["marketing.content.events"];
  state.list.mockResolvedValue([{id:"active",name:"RSVP",slug:"rsvp",isActive:true,kind:"custom",fields:[{private:true}],settings:{recipients:["private@example.test"]}},{id:"inactive",name:"Closed",isActive:false},{id:"application",name:"Private",isActive:true,kind:"application"}]);
  const response=await request("/events/registration-forms");expect(response.status).toBe(200);
  expect(await response.json()).toEqual([{id:"active",name:"RSVP",slug:"rsvp"}]);
  state.eventGet.mockResolvedValue({id:"event",title:"Event",date:new Date("2026-10-01T12:00:00Z"),registrationFormId:"inactive",registrationOpensAt:new Date("2026-09-20T12:00:00Z")});
  state.eventUpdate.mockImplementation(async(id,data)=>({id,...data}));
  // Unchanged saved references survive catalog changes; a new inactive selection is rejected.
  expect((await request("/events/event","PUT",{},"/service",{registrationFormId:"inactive",registrationEnabled:false})).status).toBe(200);
  state.form.mockResolvedValue({isActive:false,kind:"custom"});
  expect((await request("/events/event","PUT",{},"/service",{registrationFormId:"other"})).status).toBe(400);
  state.form.mockResolvedValue({isActive:true,kind:"application"});
  expect((await request("/events/event","PUT",{},"/service",{registrationFormId:"other"})).status).toBe(400);
  state.form.mockResolvedValue({isActive:true,kind:"custom"});
  expect((await request("/events/event","PUT",{},"/service",{registrationFormId:"active",capacity:10,registrationApprovalMode:"manual"})).status).toBe(200);
  expect((await request("/events/event","PUT",{},"/service",{registrationFormId:null,capacity:null})).status).toBe(200);
  const writes=state.eventUpdate.mock.calls.length;
  for(const body of [{registrationFormId:42},{capacity:0},{capacity:2.5},{capacity:"10"},{waitlistEnabled:"true"},{registrationEnabled:1},{registrationOpensAt:"invalid"},{registrationClosesAt:"2026-09-19T12:00:00Z"}])expect((await request("/events/event","PUT",{},"/service",body)).status).toBe(400);
  expect(state.eventUpdate).toHaveBeenCalledTimes(writes);
  identity.capabilities=["marketing.content.forms"];
  expect((await request("/events/registration-forms")).status).toBe(403);
});
