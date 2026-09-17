import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({
  identity: null as any,
  role: "admin",
  getAll: vi.fn(),
  save: vi.fn(),
  legacySave: vi.fn(),
  remove: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("../middleware/auth", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: "linked", role: state.role };
    req.dashboardIdentity = state.identity;
    next();
  },
  hasAdminPermission: () => false,
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));
vi.mock("../storage/index", () => ({
  storage: {
    settings: {
      getAllSettings: state.getAll,
      upsertSettings: state.save,
      upsertSetting: state.legacySave,
      deleteSetting: state.remove,
      invalidateCategory: state.invalidate,
    },
  },
}));
vi.mock("../services/email.service", () => ({
  sendEmail: vi.fn(),
  testMailgunConnection: vi.fn(),
  renderEmailShell: vi.fn(),
  renderTemplate: vi.fn(),
  resetEmailBrandingCache: vi.fn(),
}));
vi.mock("../services/r2.service", () => ({ resetClient: vi.fn() }));
vi.mock("../services/system-email-templates.service", () => ({
  ensureSystemEmailTemplates: vi.fn(),
}));
vi.mock("../services/mailchimp.service", () => ({ testMailchimpConnection: vi.fn() }));
vi.mock("../services/cms-media-upload.service", () => ({ createCmsMediaAssetFromUpload: vi.fn() }));
import router from "./settings.routes";
import { errorHandler } from "../middleware/error-handler";
let server: Server, base: string;
beforeEach(async () => {
  vi.clearAllMocks();
  state.identity = null;
  state.role = "admin";
  state.getAll.mockResolvedValue([]);
  state.save.mockImplementation(async (entries: any) => entries);
  state.legacySave.mockResolvedValue({ key: "other", value: "literal", isSecret: false });
  const app = express();
  app.use(express.json(), router, errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => new Promise<void>((resolve) => server.close(() => resolve())));
const body = {
  key: "public_head_html",
  category: "head_tag_additions",
  value: "<script>literal()</script>",
  isSecret: false,
};
const put = (data = body) =>
  fetch(base + "/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
it("legacy local administrators cannot bypass canonical Owner head-tag writes", async () => {
  for (const identity of [
    null,
    { active: true, role: "member", ownerAttested: true },
    { active: true, role: "owner", ownerAttested: false },
    { active: false, role: "owner", ownerAttested: true },
  ]) {
    state.identity = identity;
    expect((await put()).status).toBe(403);
  }
  expect(state.save).not.toHaveBeenCalled();
  expect(state.legacySave).not.toHaveBeenCalled();
  state.identity = { active: true, role: "owner", ownerAttested: true };
  state.role = "editor";
  expect((await put()).status).toBe(200);
  expect(state.save).toHaveBeenCalledWith([body], undefined, {
    userId: "linked",
    action: "website_head_tags_updated",
    details: "public_head_html (legacy settings route)",
  });
  expect((await fetch(base + "/settings/public_head_html", { method: "DELETE" })).status).toBe(400);
  expect(state.remove).not.toHaveBeenCalled();
});
it("retagging an existing protected setting is denied, while unrelated legacy writes retain their contract", async () => {
  state.getAll.mockResolvedValue([
    { key: "custom_head", category: "head_tag_additions", isSecret: false, value: "old" },
  ]);
  expect((await put({ ...body, key: "custom_head", category: "other" })).status).toBe(403);
  expect(state.legacySave).not.toHaveBeenCalled();
  expect((await put({ ...body, key: "other", category: "other", value: "literal" })).status).toBe(
    200,
  );
  expect(state.legacySave).toHaveBeenCalledWith("other", "literal", "other", false);
});

it("legacy website feature keys and categories require canonical ownership and remain audited",async()=>{
 for(const key of ["enable_cms","enable_blog","enable_events","enable_crm","enable_careers"]){
  expect((await put({...body,key,category:"system_configuration",value:"false"})).status).toBe(403);
  expect((await put({...body,key,category:"other",value:"false"})).status).toBe(403);
 }
 expect(state.save).not.toHaveBeenCalled();
 state.identity={active:true,role:"owner",ownerAttested:true};state.role="editor";
 const feature={key:"enable_events",category:"system_configuration",value:"true",isSecret:false};expect((await put(feature)).status).toBe(200);expect(state.save).toHaveBeenCalledWith([feature],undefined,{userId:"linked",action:"website_features_updated",details:"enable_events (legacy settings route)"});
 expect((await fetch(base+"/settings/enable_events",{method:"DELETE"})).status).toBe(400);expect(state.remove).not.toHaveBeenCalled();
});

it("legacy generic color mutations direct all callers to the versioned Design editor",async()=>{
 for(const identity of [null,{active:true,role:"member",capabilities:["marketing.design.branding"]},{active:true,role:"owner",ownerAttested:true,capabilities:["marketing.design.colors"]}]){
  state.identity=identity;
  for(const category of ["branding","unrelated"]){
   for(const key of ["brand_primary_color","text_muted_color"]) expect((await put({key,category,value:"#123456",isSecret:false})).status).toBe(409);
  }
  expect((await fetch(base+"/settings/brand_primary_color",{method:"DELETE"})).status).toBe(409);
 }
 expect(state.save).not.toHaveBeenCalled();expect(state.legacySave).not.toHaveBeenCalled();expect(state.remove).not.toHaveBeenCalled();
});
