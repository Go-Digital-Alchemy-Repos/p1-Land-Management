import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({
  role: "admin",
  identity: null as any,
  all: vi.fn(),
  save: vi.fn(),
  batch: vi.fn(),
  remove: vi.fn(),
  test: vi.fn(),
}));
vi.mock("../middleware/auth", () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: "actor", role: state.role };
    req.dashboardIdentity = state.identity;
    next();
  },
  hasAdminPermission: () => state.role === "design-editor",
  requireRole: (role: string) => (req: any, res: any, next: any) =>
    req.user.role === role ? next() : res.status(403).json({ message: "Forbidden" }),
}));
vi.mock("../storage/index", () => ({
  storage: {
    settings: {
      getAllSettings: state.all,
      upsertSetting: state.save,
      upsertSettings: state.batch,
      deleteSetting: state.remove,
      invalidateCategory: vi.fn(),
    },
  },
}));
vi.mock("../services/email.service", () => ({
  sendEmail: vi.fn(),
  renderEmailShell: vi.fn(),
  renderTemplate: vi.fn(),
  resetEmailBrandingCache: vi.fn(),
  testMailgunConnection: state.test,
}));
vi.mock("../services/r2.service", () => ({ resetClient: vi.fn(), testConnection: state.test }));
vi.mock("../services/mailchimp.service", () => ({ testMailchimpConnection: state.test }));
vi.mock("../services/system-email-templates.service", () => ({
  SYSTEM_EMAIL_TEMPLATE_DEFAULTS: [],
}));
vi.mock("../utils/logger", () => ({ logger: { app: { warn: vi.fn(), error: vi.fn() } } }));
import router from "./settings.routes";
import { errorHandler } from "../middleware/error-handler";
import { integrationRegistry } from "@shared/website-integrations";
let server: Server, base: string;
beforeEach(async () => {
  vi.clearAllMocks();
  state.role = "admin";
  state.identity = { active: true, role: "owner", ownerAttested: true };
  state.all.mockResolvedValue([]);
  state.save.mockImplementation(
    async (key: string, value: string, category: string, isSecret: boolean) => ({
      key,
      value,
      category,
      isSecret,
    }),
  );
  const app = express();
  app.use(express.json(), router, errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => {
  expect(state.test).not.toHaveBeenCalled();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
const req = (path: string, method: string, body?: unknown) =>
  fetch(base + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const put = (key: string, category: string) =>
  req("/settings", "PUT", { key, category, value: "synthetic", isSecret: false });
it("blocks every registry key regardless of caller category and every provider category regardless of key", async () => {
  for (const [provider, registry] of Object.entries(integrationRegistry)) {
    for (const key of [...registry.publicKeys, ...registry.secretKeys]) {
      expect((await put(key, "unrelated")).status).toBe(409);
      expect((await req(`/settings/${key}`, "DELETE")).status).toBe(409);
    }
    const res = await put("new-key", provider);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      message: "Manage website integrations in Marketing > Website System > Integrations",
    });
  }
  expect(state.save).not.toHaveBeenCalled();
  expect(state.batch).not.toHaveBeenCalled();
  expect(state.remove).not.toHaveBeenCalled();
});
it("blocks recategorization and deletion of historical provider-category keys", async () => {
  for (const provider of Object.keys(integrationRegistry)) {
    state.all.mockResolvedValue([
      { key: "historical", category: provider, value: "", isSecret: true },
    ]);
    expect((await put("historical", "branding")).status).toBe(409);
    expect((await req("/settings/historical", "DELETE")).status).toBe(409);
  }
  expect(state.save).not.toHaveBeenCalled();
  expect(state.remove).not.toHaveBeenCalled();
});
it("requires attested active Owner even for the migration response and provider tests", async () => {
  for (const identity of [
    null,
    { active: false, role: "owner", ownerAttested: true },
    { active: true, role: "owner", ownerAttested: false },
    { active: true, role: "member", ownerAttested: true },
  ]) {
    state.identity = identity;
    expect((await put("mailgun_api_key", "branding")).status).toBe(403);
    expect((await req("/settings/mailgun_api_key", "DELETE")).status).toBe(403);
    expect(
      (await req("/settings/test-connection", "POST", { integration: "mailgun" })).status,
    ).toBe(403);
  }
  expect(state.save).not.toHaveBeenCalled();
  expect(state.remove).not.toHaveBeenCalled();
});
it("redirects all retained provider connection tests without calling providers", async () => {
  for (const integration of Object.keys(integrationRegistry))
    expect((await req("/settings/test-connection", "POST", { integration })).status).toBe(409);
});
it("preserves unrelated generic settings and their existing administrator gate", async () => {
  expect((await put("other-setting", "unrelated")).status).toBe(200);
  expect(state.save).toHaveBeenCalledWith("other-setting", "synthetic", "unrelated", false);
  expect((await req("/settings/other-setting", "DELETE")).status).toBe(200);
  expect(state.remove).toHaveBeenCalledWith("other-setting");
  state.role = "editor";
  expect((await put("another-setting", "unrelated")).status).toBe(403);
  expect((await req("/settings/another-setting", "DELETE")).status).toBe(403);
  expect(state.save).toHaveBeenCalledTimes(1);
  expect(state.remove).toHaveBeenCalledTimes(1);
});

it("excludes registered keys and provider categories from legacy reads regardless of stored secret flags", async () => {
  state.all.mockResolvedValue([
    { key: "mailgun_api_key", value: "must-not-leak", category: "branding", isSecret: false },
    { key: "r2_secret_access_key", value: "must-not-leak", category: "other", isSecret: false },
    {
      key: "historical-provider-key",
      value: "must-not-leak",
      category: "mailchimp",
      isSecret: false,
    },
    { key: "site-example", value: "public", category: "branding", isSecret: false },
    { key: "other-secret", value: "must-not-leak", category: "other", isSecret: true },
  ]);
  for (const role of ["admin", "design-editor"]) {
    state.role = role;
    const response = await req("/settings", "GET");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.branding).toEqual({ "site-example": { value: "public", isSecret: false } });
    expect(payload.mailchimp).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("must-not-leak");
    expect(JSON.stringify(payload)).not.toContain("mailgun_api_key");
    expect(JSON.stringify(payload)).not.toContain("r2_secret_access_key");
  }
});
it("blocks Google target generic writes/deletes/category laundering and hides legacy read values", async () => {
  expect((await put("p1_google_reporting_property_id", "branding")).status).toBe(409);
  expect((await req("/settings/p1_google_reporting_property_id", "DELETE")).status).toBe(409);
  expect((await put("unregistered", "google_reporting")).status).toBe(409);
  state.all.mockResolvedValue([
    {
      key: "p1_google_reporting_property_id",
      category: "branding",
      value: "DO_NOT_LEAK",
      isSecret: false,
    },
    { key: "historical", category: "google_reporting", value: "DO_NOT_LEAK", isSecret: false },
  ]);
  expect((await put("historical", "branding")).status).toBe(409);
  expect((await req("/settings/historical", "DELETE")).status).toBe(409);
  expect(await (await req("/settings", "GET")).text()).not.toContain("DO_NOT_LEAK");
  expect(state.save).not.toHaveBeenCalled();
  expect(state.remove).not.toHaveBeenCalled();
});
