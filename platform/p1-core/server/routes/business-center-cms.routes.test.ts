import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({
  careerWebhook:vi.fn(),careerDelete:vi.fn(),careerSave:vi.fn(),careerApplication:vi.fn(),careerResume:vi.fn(),careerReview:vi.fn(),careerJobs:vi.fn(),careerSettings:vi.fn(),careerCreate:vi.fn(),careerGet:vi.fn(),careerUpdate:vi.fn(),careerSlug:vi.fn(),
  headSnapshot: vi.fn(),headSave: vi.fn(),
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
  eventCancel: vi.fn(),
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
    settings: {getCategorySnapshot:state.headSnapshot,upsertSettings:state.headSave},
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
    careers:{deleteJob:state.careerDelete,getApplication:state.careerApplication,reviewApplication:state.careerReview,getJobs:state.careerJobs,createJob:state.careerCreate,getJob:state.careerGet,updateJob:state.careerUpdate,getJobSlugOwner:state.careerSlug},
    events: {updateCanceledEvent:state.eventCancel,updateEvent:state.eventUpdate,getAllEvents:state.events,getEvent:state.eventGet,createEvent:state.eventCreate,getEventSlugOwner:state.eventSlug},
    eventVenues:{getAllVenues:state.venues},
    eventOrganizers:{getAllOrganizers:state.organizers},
    eventRegistrations:{getEventAnalytics:state.eventAnalytics,getRegistrationsByEvent:state.attendees,setEventAttendance:state.attendance},
    forms: { getAll: state.list, getById: state.form, getBySlug: state.formSlug, create: state.formCreate, update: state.formUpdate, updateIfUnchanged: state.formUpdate, delete: state.formDelete, getSubmissionsByFormId: state.formSubmissions, deleteSubmission: state.formDeleteSubmission, listDeliveryJobs: state.formJobs, requeueFailedEffectJob: state.formRetry },
    editorLocks: { listActiveByResourceType: state.list },
  },
}));
vi.mock("../services/email.service", () => ({resetEmailBrandingCache:vi.fn(),sendEventCanceledEmail:state.eventMail,sendEventReminderEmail:state.eventMail,sendRecordingAvailableEmail:state.eventMail}));
vi.mock("../services/commercial-backfill.service", () => ({ backfillCommercialInquiries: vi.fn() }));
vi.mock("../storage/index", async () => await import("../storage"));
vi.mock("../services/careers.service",()=>({getCareerSettings:state.careerSettings,saveCareerSettings:state.careerSave,dispatchCareerWebhook:state.careerWebhook,loadCareerResume:state.careerResume}));
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


it("notifies the exact atomic cancellation result, including pending registrations", async () => {
  identity.capabilities=["marketing.content.events"];
  state.eventGet.mockResolvedValue({id:"event",title:"Workshop",status:"published"});
  state.eventCancel.mockResolvedValue({event:{id:"event",title:"Workshop",status:"canceled"},canceled:[{id:"one",fullName:"First Guest",email:"first@example.test"},{id:"two",fullName:"Second Guest",email:"second@example.test"}]});
  state.eventMail.mockResolvedValue(true);
  const response=await request("/events/event","PUT",{},"/service",{status:"canceled"});
  expect(response.status).toBe(200);expect(await response.json()).toMatchObject({status:"canceled"});
  expect(state.eventCancel).toHaveBeenCalledExactlyOnceWith("event",{status:"canceled"});
  expect(state.eventUpdate).not.toHaveBeenCalled();
  expect(state.eventMail).toHaveBeenCalledTimes(2);
  expect(state.eventMail).toHaveBeenCalledWith("first@example.test","First","Workshop");
  state.eventCancel.mockResolvedValue({event:{id:"event",title:"Workshop",status:"canceled"},canceled:[]});
  expect((await request("/events/event","PUT",{},"/service",{status:"canceled"})).status).toBe(200);
  expect(state.eventMail).toHaveBeenCalledTimes(2);
  state.eventCancel.mockRejectedValue(new Error("Synthetic transaction failure"));
  expect((await request("/events/event","PUT",{},"/service",{status:"canceled"})).status).toBe(500);
  expect(state.eventMail).toHaveBeenCalledTimes(2);
});

it("Careers requires its own leaf grant and preserves feature and Owner settings gates",async()=>{
 state.careerJobs.mockResolvedValue([{id:'job',title:'Synthetic job'}]);
 const headers={authorization:`Bearer ${key}`,'x-p1-user-grant':grantId};
 const get=(path:string)=>fetch(base+'/service/careers'+path,{headers});
 expect((await get('/jobs')).status).toBe(403);
 identity.capabilities=['marketing.content.careers'];
 const jobs=await get('/jobs');expect(jobs.status).toBe(200);expect(await jobs.json()).toEqual([{id:'job',title:'Synthetic job'}]);
 expect((await get('/settings')).status).toBe(403);
 expect((await get('/SETTINGS/')).status).toBe(403);
 identity.role='owner';identity.ownerAttested=false;expect((await get('/settings')).status).toBe(403);
 identity.ownerAttested=true;state.careerSettings.mockResolvedValue({sharing:{enabled:true}});expect((await get('/settings')).status).toBe(200);
 state.enabled.mockResolvedValue(false);expect((await get('/jobs')).status).toBe(404);
});

it("Careers author fields come from the linked actor and updates preserve original authorship",async()=>{
 identity.capabilities=['marketing.content.careers'];
 state.careerSlug.mockResolvedValue(null);
 state.careerCreate.mockImplementation(async data=>({id:'career',...data}));
 const created=await request('/careers/jobs','POST',{},'/service',{title:'Synthetic opening',createdBy:'forged',updatedBy:'forged'});
 expect(created.status).toBe(201);expect(state.careerCreate.mock.calls[0][0]).toMatchObject({createdBy:'linked',updatedBy:'linked'});
 state.careerGet.mockResolvedValue({id:'career',title:'Synthetic opening',slug:'synthetic-opening',createdBy:'original'});
 state.careerUpdate.mockResolvedValue({id:'career'});
 const updated=await request('/careers/jobs/career','PUT',{},'/service',{summary:'Edited',createdBy:'forged',updatedBy:'forged'});
 expect(updated.status).toBe(200);expect(state.careerUpdate.mock.calls[0][1]).toMatchObject({updatedBy:'linked'});expect(state.careerUpdate.mock.calls[0][1]).not.toHaveProperty('createdBy');
});

it("Careers returns a conflict when the saved job version is stale",async()=>{
 identity.capabilities=['marketing.content.careers'];
 state.careerGet.mockResolvedValue({id:'career',title:'Existing',slug:'existing'});
 state.careerUpdate.mockResolvedValue(undefined);
 const response=await request('/careers/jobs/career','PUT',{},'/service',{summary:'Local edit',expectedUpdatedAt:'2030-01-01T00:00:00.000Z'});
 expect(response.status).toBe(409);
 expect(state.careerUpdate).toHaveBeenCalledWith('career',expect.objectContaining({summary:'Local edit'}),'2030-01-01T00:00:00.000Z');
 const invalid=await request('/careers/jobs/career','PUT',{},'/service',{summary:'Local edit',expectedUpdatedAt:'not-a-date'});
 expect(invalid.status).toBe(400);
});

it("Careers application review retains its version and trusted actor, returning conflicts and missing records",async()=>{
 identity.capabilities=['marketing.content.careers'];
 state.careerReview.mockResolvedValue({kind:'saved',application:{id:'application',status:'reviewing'}});
 const result=await request('/careers/applications/application','PUT',{},'/service',{status:'reviewing',note:'Review note',expectedUpdatedAt:'2030-01-01T00:00:00.000Z',createdBy:'forged'});
 expect(result.status).toBe(200);expect(state.careerReview).toHaveBeenCalledWith('application',{status:'reviewing',note:'Review note',expectedUpdatedAt:'2030-01-01T00:00:00.000Z'},'linked');
 state.careerReview.mockResolvedValue({kind:'conflict'});expect((await request('/careers/applications/application','PUT',{},'/service',{note:'Retained note'})).status).toBe(409);
 state.careerReview.mockResolvedValue({kind:'missing'});expect((await request('/careers/applications/application','PUT',{},'/service',{note:'Retained note'})).status).toBe(404);
});


it("Career resumes require fresh access and are private binary attachments with encoded filenames", async () => {
  const bytes = Buffer.from([0, 255, 13, 10, 37, 80, 68, 70]);
  state.careerApplication.mockResolvedValue({id:"application",resumeStorageKey:"local:synthetic.pdf",resumeFileName:'résumé\r\nInjected: value.pdf',resumeMimeType:"text/html"});
  state.careerResume.mockResolvedValue({buffer:bytes,contentType:"text/html"});
  const path="/careers/applications/application/resume";
  expect((await request(path)).status).toBe(403);
  expect(state.careerResume).not.toHaveBeenCalled();
  identity.capabilities=["marketing.content.careers"];
  const response=await request(path);
  expect(response.status).toBe(200);
  expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  expect(response.headers.get("content-type")).toBe("application/octet-stream");
  expect(response.headers.get("content-disposition")).toMatch(/^attachment;/);
  expect(response.headers.get("content-disposition")).toContain("filename*=UTF-8''");
  expect(response.headers.get("injected")).toBeNull();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  state.careerResume.mockResolvedValue(null);
  expect((await request(path)).status).toBe(404);
  state.careerApplication.mockResolvedValue(undefined);
  state.careerResume.mockClear();
  expect((await request(path)).status).toBe(404);
  expect(state.careerResume).not.toHaveBeenCalled();
  identity.capabilities=[];
  expect((await request(path)).status).toBe(403);
});


it("Career settings writes require an attested active Owner and preserve the dedicated feature gate", async () => {
  const payload={version:"a".repeat(64),sharing:{enabled:false},integrations:{indeedApplySecret:"synthetic-replacement"}};
  identity.capabilities=["marketing.content.careers"];
  expect((await request("/careers/settings","PUT",{},"/service",payload)).status).toBe(403);
  expect(state.careerSave).not.toHaveBeenCalled();
  identity.role="owner";identity.ownerAttested=false;
  expect((await request("/careers/settings","PUT",{},"/service",payload)).status).toBe(403);
  identity.ownerAttested=true;
  state.careerSave.mockResolvedValue({sharing:{enabled:false},integrations:{indeedApplySecret:""}});
  const response=await request("/careers/settings","PUT",{},"/service",payload);
  expect(response.status).toBe(200);
  expect(state.careerSave).toHaveBeenCalledTimes(1);
  expect(state.careerSave.mock.calls[0][0]).toMatchObject(payload);
  expect(JSON.stringify(await response.json())).not.toContain("synthetic-replacement");
  state.enabled.mockResolvedValue(false);
  expect((await request("/careers/settings","PUT",{},"/service",payload)).status).toBe(404);
  expect(state.careerSave).toHaveBeenCalledTimes(1);
});


it("Career settings forwards versions and reports stale or malformed updates",async()=>{
 identity.role="owner";identity.ownerAttested=true;
 state.careerSave.mockRejectedValue(Object.assign(new Error("These settings changed"),{statusCode:409}));
 const response=await request("/careers/settings","PUT",{},"/service",{version:"a".repeat(64)});
 expect(response.status).toBe(409);
 expect(state.careerSave.mock.calls[0][0].version).toBe("a".repeat(64));
 expect((await request("/careers/settings","PUT",{},"/service",{version:"invalid"})).status).toBe(400);
 expect((await request("/careers/settings","PUT",{},"/service",{})).status).toBe(400);
 expect(state.careerSave).toHaveBeenCalledTimes(1);
});


it("Career credential removals require Owner access and validated explicit selections",async()=>{
 const payload={version:"a".repeat(64),clearCredentials:["indeedApplySecret"],integrations:{indeedApplyEnabled:false}};
 identity.capabilities=["marketing.content.careers"];
 expect((await request("/careers/settings","PUT",{},"/service",payload)).status).toBe(403);
 expect(state.careerSave).not.toHaveBeenCalled();
 identity.role="owner";identity.ownerAttested=true;
 state.careerSave.mockResolvedValue({version:"b".repeat(64)});
 expect((await request("/careers/settings","PUT",{},"/service",payload)).status).toBe(200);
 expect(state.careerSave.mock.calls[0][0]).toMatchObject(payload);
 expect((await request("/careers/settings","PUT",{},"/service",{...payload,integrations:{indeedApplyEnabled:true}})).status).toBe(400);
 expect((await request("/careers/settings","PUT",{},"/service",{...payload,clearCredentials:["unknown"]})).status).toBe(400);
 expect(state.careerSave).toHaveBeenCalledTimes(1);
});


it("Career deletion rejects missing/stale versions and applications before deletion webhooks",async()=>{
 identity.capabilities=["marketing.content.careers"];
 expect((await request("/careers/jobs/job","DELETE")).status).toBe(400);
 expect(state.careerDelete).not.toHaveBeenCalled();
 const payload={expectedUpdatedAt:"2030-01-01T00:00:00.000Z"};
 for (const [kind,status] of [["conflict",409],["has_applications",409],["missing",404]] as const) {
  state.careerDelete.mockResolvedValue({kind});
  expect((await request("/careers/jobs/job","DELETE",{},"/service",payload)).status).toBe(status);
 }
 expect(state.careerDelete).toHaveBeenCalledWith("job",payload.expectedUpdatedAt);
 expect(state.careerWebhook).not.toHaveBeenCalled();
 state.careerDelete.mockResolvedValue({kind:"deleted",job:{id:"job",title:"Synthetic"}});
 const response=await request("/careers/jobs/job","DELETE",{},"/service",payload);
 expect(response.status).toBe(200);expect(await response.json()).toEqual({success:true});
 expect(state.careerWebhook).toHaveBeenCalledWith("career.job.deleted",{id:"job",title:"Synthetic"});
 identity.capabilities=[];
 expect((await request("/careers/jobs/job","DELETE",{},"/service",payload)).status).toBe(403);
 expect(state.careerDelete).toHaveBeenCalledTimes(4);
});

it("website head settings require an attested Owner and stay available when CMS is disabled", async()=>{
 state.enabled.mockResolvedValue(false);
 for(const bad of [{active:true,role:"member",ownerAttested:false},{active:true,role:"owner",ownerAttested:false},{active:false,role:"owner",ownerAttested:true}]){
  identity={...bad,capabilities:["marketing.content.pages"]};
  expect((await request("/website-system/head-tags")).status).toBe(403);
  expect((await request("/website-system/head-tags","PUT",{},"/service",{})).status).toBe(403);
 }
 expect(state.headSnapshot).not.toHaveBeenCalled();expect(state.headSave).not.toHaveBeenCalled();
 identity={active:true,role:"owner",ownerAttested:true,capabilities:[]};
 state.headSnapshot.mockResolvedValue({values:{public_head_html:'<script>literal()</script>',unrelated:'not projected'},version:'a'.repeat(64)});
 const read=await request("/website-system/head-tags");expect(read.status).toBe(200);expect(await read.json()).toEqual({html:'<script>literal()</script>',version:'a'.repeat(64)});
 expect(state.headSnapshot).toHaveBeenCalledWith("head_tag_additions",true);
 const body={html:'<meta name="test" content="literal">',expectedVersion:'a'.repeat(64)};
 expect((await request("/website-system/head-tags","PUT",{},"/service",body)).status).toBe(200);
 expect(state.headSave).toHaveBeenCalledWith([{key:"public_head_html",category:"head_tag_additions",value:body.html,isSecret:false}],{category:"head_tag_additions",version:body.expectedVersion,publicOnly:true},{userId:"linked",action:"website_head_tags_updated",details:"public_head_html"});
 for(const invalid of [{...body,key:"secret"},{html:body.html},{...body,html:'x'.repeat(100001)}])expect((await request("/website-system/head-tags","PUT",{},"/service",invalid)).status).toBe(400);
 state.headSave.mockRejectedValueOnce(Object.assign(new Error("Changed"),{statusCode:409}));expect((await request("/website-system/head-tags","PUT",{},"/service",body)).status).toBe(409);
 identity.active=false;expect((await request("/website-system/head-tags")).status).toBe(403);
});

it("website module flags normalize retained values and save one Owner-only versioned set outside module gates",async()=>{
 const defaults={cmsEnabled:true,blogEnabled:true,eventsEnabled:false,crmEnabled:true,careersEnabled:false};
 for(const value of [{active:true,role:"member",ownerAttested:false},{active:true,role:"owner",ownerAttested:false},{active:false,role:"owner",ownerAttested:true}]){
  identity={...value,capabilities:["marketing.content.pages","marketing.content.events"]};
  expect((await request("/website-system/features")).status).toBe(403);
  expect((await request("/website-system/features","PUT",{},"/service",{})).status).toBe(403);
 }
 identity={active:true,role:"owner",ownerAttested:true,capabilities:[]};state.enabled.mockResolvedValue(false);
 state.headSnapshot.mockResolvedValue({values:{enable_cms:"OFF",enable_blog:"yes",enable_events:"1",enable_crm:"invalid",unrelated:"not projected"},version:'b'.repeat(64)});
 const response=await request("/website-system/features");expect(response.status).toBe(200);expect(await response.json()).toEqual({features:{...defaults,cmsEnabled:false,eventsEnabled:true},defaults,version:'b'.repeat(64)});
 const features={cmsEnabled:false,blogEnabled:false,eventsEnabled:false,crmEnabled:false,careersEnabled:false};
 expect((await request("/website-system/features","PUT",{},"/service",{features,expectedVersion:'b'.repeat(64)})).status).toBe(200);
 const [entries,revision,audit]=state.headSave.mock.calls.at(-1)!;
 expect(entries).toEqual(['enable_cms','enable_blog','enable_events','enable_crm','enable_careers'].map(key=>({key,category:"system_configuration",value:"false",isSecret:false})));
 expect(revision).toEqual({category:"system_configuration",version:'b'.repeat(64),publicOnly:true});
 expect(audit).toEqual({userId:"linked",action:"website_features_updated",details:JSON.stringify(features)});
 expect((await request("/website-system/features")).status).toBe(200);
 for(const bad of [{features:{...features,eventsEnabled:"true"},expectedVersion:'b'.repeat(64)},{features:{cmsEnabled:true},expectedVersion:'b'.repeat(64)},{features:{...features,unknown:true},expectedVersion:'b'.repeat(64)},{features,expectedVersion:'b'.repeat(64),category:'branding'}]) expect((await request("/website-system/features","PUT",{},"/service",bad)).status).toBe(400);
 state.headSave.mockRejectedValueOnce(Object.assign(new Error("Changed"),{statusCode:409}));expect((await request("/website-system/features","PUT",{},"/service",{features,expectedVersion:'b'.repeat(64)})).status).toBe(409);
});

it("website colors require the precise fresh Design grant, preserve raw values and atomically save only changed fields",async()=>{
 const body={colors:{brand_primary_color:"#123AbC",text_body_color:""},expectedVersion:"d".repeat(64)};
 for(const role of ["member","crew","client","owner"]){
  identity={active:true,role,ownerAttested:false,capabilities:role==="member"?["marketing.design.branding"]:["marketing.design.colors"]};
  expect((await request("/design/colors")).status).toBe(403);
  expect((await request("/design/colors","PUT",{},"/service",body)).status).toBe(403);
 }
 identity={active:true,role:"member",ownerAttested:false,capabilities:["marketing.design.colors"]};
 state.enabled.mockResolvedValue(false);
 state.headSnapshot.mockResolvedValue({values:{brand_primary_color:"legacy custom value",company_name:"not projected",text_muted_color:"#111111"},version:"d".repeat(64)});
 const read=await request("/design/colors");expect(read.status).toBe(200);
 const result=await read.json();expect(result.colors.brand_primary_color).toBe("legacy custom value");expect(result.colors.text_body_color).toBe("");expect(Object.keys(result.colors)).toHaveLength(18);expect(result.colors.company_name).toBeUndefined();expect(result.colors.text_muted_color).toBeUndefined();
 expect(state.headSnapshot).toHaveBeenCalledWith("branding",true);
 expect((await request("/design/colors","PUT",{},"/service",body)).status).toBe(200);
 expect(state.headSave).toHaveBeenCalledWith([
  {key:"brand_primary_color",value:"#123AbC",category:"branding",isSecret:false},
  {key:"text_body_color",value:"",category:"branding",isSecret:false},
 ],{category:"branding",version:body.expectedVersion,publicOnly:true},{userId:"linked",action:"website_colors_updated",details:JSON.stringify(["brand_primary_color","text_body_color"])});
 for(const colors of [{},{company_name:"wrong"},{brand_primary_color:"red"},{brand_primary_color:"#123"},{brand_primary_color:null},{brand_primary_color:"url(https://example.test)"}])expect((await request("/design/colors","PUT",{},"/service",{...body,colors})).status).toBe(400);
 expect((await request("/design/colors?extra=1")).status).toBe(400);
 expect((await request("/design/colors","PUT",{},"/service",{...body,category:"other"})).status).toBe(400);
 state.headSave.mockRejectedValueOnce(Object.assign(new Error("Changed"),{statusCode:409}));expect((await request("/design/colors","PUT",{},"/service",body)).status).toBe(409);
 identity.active=false;expect((await request("/design/colors")).status).toBe(403);
 identity={active:true,role:"owner",ownerAttested:true,capabilities:["marketing.design.colors"]};expect((await request("/design/colors")).status).toBe(200);
});

it("typography retains the catalog and unknown saved values while requiring its exact grant",async()=>{
 const body={fonts:{frontend_heading_font:"lora"},expectedVersion:"f".repeat(64)};
 identity.capabilities=["marketing.design.colors"];expect((await request("/design/typography")).status).toBe(403);expect((await request("/design/typography","PUT",{},"/service",body)).status).toBe(403);
 identity.capabilities=["marketing.design.typography"];state.enabled.mockResolvedValue(false);
 state.headSnapshot.mockResolvedValue({values:{frontend_body_font:"custom old font",frontend_heading_font:"inter",company_name:"private projection"},version:"f".repeat(64)});
 const read=await request("/design/typography");expect(read.status).toBe(200);const data=await read.json();expect(data.fonts).toEqual({frontend_body_font:"custom old font",frontend_heading_font:"inter"});expect(data.options).toHaveLength(20);expect(data.options.map((x:any)=>x.value)).toContain("source-serif-4");
 expect((await request("/design/typography","PUT",{},"/service",body)).status).toBe(200);
 expect(state.headSave).toHaveBeenCalledWith([{key:"frontend_heading_font",value:"lora",category:"branding",isSecret:false}],{category:"branding",version:body.expectedVersion,publicOnly:true},{userId:"linked",action:"website_typography_updated",details:'["frontend_heading_font"]'});
 for(const fonts of [{},{frontend_heading_font:"unsupported"},{frontend_body_font:"url(evil)"},{other:"inter"},{frontend_body_font:null}])expect((await request("/design/typography","PUT",{},"/service",{...body,fonts})).status).toBe(400);
 expect((await request("/design/typography?other=1")).status).toBe(400);
 expect((await request("/design/typography","PUT",{},"/service",{...body,fonts:{frontend_heading_font:""}})).status).toBe(200);
 state.headSave.mockRejectedValueOnce(Object.assign(Error("Changed"),{statusCode:409}));expect((await request("/design/typography","PUT",{},"/service",body)).status).toBe(409);
 for(const role of ["crew","client"]){identity.role=role;expect((await request("/design/typography")).status).toBe(403);}
 identity.role="member";identity.active=false;expect((await request("/design/typography")).status).toBe(403);
});

it("social settings require their own leaf grant and save validated changed settings atomically",async()=>{
 const version="e".repeat(64),body={settings:{social_facebook_url:" https://example.test/profile ",social_icon_style:"outline"},expectedVersion:version};
 identity.capabilities=["marketing.design.branding"];expect((await request("/design/social-media")).status).toBe(403);expect((await request("/design/social-media","PUT",{},"/service",body)).status).toBe(403);
 identity.capabilities=["marketing.design.social-media"];state.enabled.mockResolvedValue(false);state.headSnapshot.mockResolvedValue({values:{social_x_url:"legacy custom address",social_icon_style:"custom",company_name:"not projected"},version});
 const read=await request("/design/social-media");expect(read.status).toBe(200);const data=await read.json();expect(Object.keys(data.settings)).toHaveLength(11);expect(data.settings.social_x_url).toBe("legacy custom address");expect(data.settings.social_icon_style).toBe("custom");expect(data.settings.social_facebook_url).toBe("");expect(data.settings.company_name).toBeUndefined();
 expect((await request("/design/social-media","PUT",{},"/service",body)).status).toBe(200);
 expect(state.headSave).toHaveBeenCalledWith([{key:"social_facebook_url",value:"https://example.test/profile",category:"branding",isSecret:false},{key:"social_icon_style",value:"outline",category:"branding",isSecret:false}],{category:"branding",version,publicOnly:true},{userId:"linked",action:"website_social_updated",details:'["social_facebook_url","social_icon_style"]'});
 for(const settings of [{},{unknown:"https://example.test"},{social_x_url:"javascript:bad()"},{social_yelp_url:"https://user:secret@example.test"},{social_x_url:"/relative"},{social_icon_style:"unknown"},{social_x_url:null}])expect((await request("/design/social-media","PUT",{},"/service",{...body,settings})).status).toBe(400);
 expect((await request("/design/social-media?other=1")).status).toBe(400);expect((await request("/design/social-media","PUT",{},"/service",{...body,settings:{social_x_url:"",social_icon_style:""}})).status).toBe(200);
 state.headSave.mockRejectedValueOnce(Object.assign(Error("Changed"),{statusCode:409}));expect((await request("/design/social-media","PUT",{},"/service",body)).status).toBe(409);
 identity.active=false;expect((await request("/design/social-media")).status).toBe(403);
});

it("identity editor requires its leaf grant and saves only versioned changes",async()=>{
 const version="e".repeat(64),body={settings:{company_name:" Test Co ",company_address:"Line 1\nLine 2"},expectedVersion:version};
 identity.capabilities=["marketing.design.colors"];expect((await request("/design/branding")).status).toBe(403);
 identity.capabilities=["marketing.design.branding"];state.enabled.mockResolvedValue(false);state.headSnapshot.mockResolvedValue({values:{frontend_logo_url:"legacy relative logo",company_name:"Retained",social_icon_style:"not included"},version});
 const read=await request("/design/branding");expect(read.status).toBe(200);const data=await read.json();expect(Object.keys(data.settings)).toHaveLength(6);expect(data.settings.frontend_logo_url).toBe("legacy relative logo");expect(data.settings.social_icon_style).toBeUndefined();
 expect((await request("/design/branding","PUT",{},"/service",body)).status).toBe(200);
 expect(state.headSave).toHaveBeenCalledWith([{key:"company_name",value:"Test Co",category:"branding",isSecret:false},{key:"company_address",value:"Line 1\nLine 2",category:"branding",isSecret:false}],{category:"branding",version,publicOnly:true},{userId:"linked",action:"website_identity_updated",details:'["company_address","company_name"]'});
 for(const settings of [{},{unknown:"x"},{favicon_url:"javascript:bad()"},{frontend_logo_url:"https://user:secret@example.test/logo.png"},{company_google_business_url:"/relative"},{company_name:"x".repeat(256)},{company_address:null}])expect((await request("/design/branding","PUT",{},"/service",{...body,settings})).status).toBe(400);
 expect((await request("/design/branding?other=1")).status).toBe(400);
 expect((await request("/design/branding","PUT",{},"/service",{...body,settings:{company_name:"",frontend_logo_url:""}})).status).toBe(200);
 state.headSave.mockRejectedValueOnce(Object.assign(new Error("changed"),{statusCode:409}));expect((await request("/design/branding","PUT",{},"/service",body)).status).toBe(409);
});

it("branding uploads are bounded prepared assets and never apply settings",async()=>{
 const upload=(settingKey:string,type="image/png",extra=false)=>{const body=new FormData();body.set("settingKey",settingKey);body.set("file",new Blob(["synthetic"],{type}),"logo.png");if(extra)body.set("unknown","x");return fetch(base+"/service/design/branding/assets",{method:"POST",headers:{authorization:`Bearer ${key}`,"x-p1-user-grant":grantId},body});};
 identity.capabilities=["marketing.content.media"];expect((await upload("frontend_logo_url")).status).toBe(403);expect(state.mediaCreate).not.toHaveBeenCalled();
 identity.capabilities=["marketing.design.branding"];state.mediaCreate.mockResolvedValue({id:"asset",url:"https://example.test/logo.webp"});
 const result=await upload("frontend_logo_url");expect(result.status).toBe(201);expect(await result.json()).toEqual({mediaId:"asset",url:"https://example.test/logo.webp"});
 expect(state.mediaCreate).toHaveBeenCalledWith(expect.objectContaining({directory:"branding",uploadedBy:"linked",title:"Site logo",mimeType:"image/png"}));expect(state.headSave).not.toHaveBeenCalled();
 const calls=state.mediaCreate.mock.calls.length;
 expect((await upload("company_name")).status).toBe(400);expect((await upload("favicon_url","image/svg+xml")).status).toBe(400);expect((await upload("favicon_url","image/png",true)).status).not.toBe(201);expect(state.mediaCreate).toHaveBeenCalledTimes(calls);
});
