// This legacy-role fixture has no linked identities; federation HTTP coverage uses the real database separately.
vi.mock("../../services/federation-runtime", () => ({ FEDERATION_COOKIE:"p1_federation_session", hasFederationHistory:async()=>false, federationConsumer:vi.fn() }));
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { User } from "@shared/schema";
import {
  DEFAULT_CRM_PIPELINE_CONFIG,
  CRM_PIPELINE_SETTING_KEY,
} from "@shared/crm-pipeline-settings";
const state = vi.hoisted(() => ({
  raw: null as string | null,
  enabled: true,
  users: new Map<string, unknown>(),
  saved: vi.fn(),
  deleted: vi.fn(),
}));
vi.mock("../../storage", () => ({
  storage: {
    users: { getUser: async (id: string) => state.users.get(id) },
    settings: {
      getSetting: async () => state.raw,
      getDecryptedCategory: async () => ({ enable_crm: String(state.enabled) }),
      upsertSetting: async (...args: unknown[]) => {
        state.saved(...args);
        state.raw = args[1] as string;
        return {};
      },
      deleteSetting: state.deleted,
    },
  },
}));
vi.mock("../../storage/index", async () => await import("../../storage"));
vi.mock("../../utils/logger", () => ({
  logger: { app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));
// Keep the actual admin router mounting and authentication; unrelated modules
// have empty child routers so no external integrations initialize in this test.
vi.mock("./dashboard.routes", () => ({ default: express.Router() }));
vi.mock("./therapists.routes", () => ({ default: express.Router() }));
vi.mock("./users.routes", () => ({ default: express.Router() }));
vi.mock("./tiers.routes", () => ({ default: express.Router() }));
vi.mock("./events.routes", () => ({ default: express.Router() }));
vi.mock("./blog.routes", () => ({ default: express.Router() }));
vi.mock("./registrations.routes", () => ({ default: express.Router() }));
vi.mock("./cms.routes", () => ({ default: express.Router() }));
vi.mock("./cms-media.routes", () => ({ default: express.Router() }));
vi.mock("./cms-sections.routes", () => ({ default: express.Router() }));
vi.mock("./cms-galleries.routes", () => ({ default: express.Router() }));
vi.mock("./cms-seo.routes", () => ({ default: express.Router() }));
vi.mock("./cms-redirects.routes", () => ({ default: express.Router() }));
vi.mock("./cms-audit.routes", () => ({ default: express.Router() }));
vi.mock("./applications.routes", () => ({ default: express.Router() }));
vi.mock("./cms-menus.routes", () => ({ default: express.Router() }));
vi.mock("./cms-sidebars.routes", () => ({ default: express.Router() }));
vi.mock("./system-backups.routes", () => ({ default: express.Router() }));
vi.mock("./forms.routes", () => ({ default: express.Router() }));
vi.mock("./editor-locks.routes", () => ({ default: express.Router() }));
vi.mock("./ecommerce.routes", () => ({ default: express.Router() }));
vi.mock("./careers.routes", () => ({ default: express.Router() }));
vi.mock("./portfolio.routes", () => ({ default: express.Router() }));
vi.mock("./membership.routes", () => ({ default: express.Router() }));
vi.mock("./client-site-content.routes", () => ({ default: express.Router() }));
vi.mock("./client-stack-onboarding.routes", () => ({ default: express.Router() }));
vi.mock("../../services/email.service", () => ({}));
vi.mock("../../services/r2.service", () => ({}));
vi.mock("../../services/system-email-templates.service", () => ({}));
vi.mock("../../services/mailchimp.service", () => ({}));
vi.mock("../../services/image-optimizer", () => ({}));
vi.mock("../../services/cms-media-upload.service", () => ({}));
import adminRouter from "./index";
import settingsRouter from "../settings.routes";
import { generateToken } from "../../middleware/auth";
import { errorHandler } from "../../middleware/error-handler";
let server: Server;
let base: string;
const cookie = (role: string, permissions: string[] = []) => {
  const user = {
    id: role + permissions.join(),
    email: "user@example.test",
    password: "synthetic-session-version",
    role,
    adminPermissions: permissions,
    isSuspended: false,
  } as unknown as User;
  state.users.set(user.id, user);
  return `p1_admin_token=${generateToken(user)}`;
};
async function request(
  path: string,
  role?: string,
  method = "GET",
  body?: unknown,
  permissions: string[] = [],
) {
  return fetch(base + path, {
    method,
    headers: {
      ...(role ? { cookie: cookie(role, permissions) } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
describe("mounted CRM settings permissions", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json(), cookieParser());
    app.use("/api/admin", adminRouter);
    app.use("/api/admin", settingsRouter);
    app.use(errorHandler);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  beforeEach(() => {
    state.raw = null;
    state.enabled = true;
    state.users.clear();
    vi.clearAllMocks();
  });
  const path = "/api/admin/crm/settings/pipeline";
  it("requires authentication", async () => {
    expect((await request(path)).status).toBe(401);
  });
  it("allows CRM editors to read but not write", async () => {
    expect((await request(path, "editor", "GET", undefined, ["crm"])).status).toBe(200);
    expect(
      (await request(path, "editor", "PUT", DEFAULT_CRM_PIPELINE_CONFIG, ["crm"])).status,
    ).toBe(403);
  });
  it("rejects unrelated editors and clients", async () => {
    expect((await request(path, "editor", "GET", undefined, ["content"])).status).toBe(403);
    expect((await request(path, "client")).status).toBe(403);
  });
  it("blocks all config access when CRM is disabled", async () => {
    state.enabled = false;
    expect((await request(path, "admin")).status).toBe(404);
    expect((await request(path, "admin", "PUT", DEFAULT_CRM_PIPELINE_CONFIG)).status).toBe(404);
  });
  it("persists valid admin writes and rejects malformed ones", async () => {
    expect((await request(path, "admin", "PUT", DEFAULT_CRM_PIPELINE_CONFIG)).status).toBe(200);
    expect(state.saved).toHaveBeenCalledWith(
      CRM_PIPELINE_SETTING_KEY,
      JSON.stringify(DEFAULT_CRM_PIPELINE_CONFIG),
      "crm",
      false,
    );
    expect((await request(path, "admin", "PUT", { version: 1, stages: [] })).status).toBe(400);
  });
  it("keeps unrelated admin routes protected from CRM editors", async () => {
    expect(
      (await request("/api/admin/dashboard-stats", "editor", "GET", undefined, ["crm"])).status,
    ).toBe(403);
  });
  it("prevents generic settings PUT and DELETE bypass", async () => {
    expect(
      (
        await request("/api/admin/settings", "admin", "PUT", {
          key: CRM_PIPELINE_SETTING_KEY,
          value: "{}",
          category: "branding",
          isSecret: true,
        })
      ).status,
    ).toBe(400);
    expect(
      (await request(`/api/admin/settings/${CRM_PIPELINE_SETTING_KEY}`, "admin", "DELETE")).status,
    ).toBe(400);
    expect(state.saved).not.toHaveBeenCalled();
    expect(state.deleted).not.toHaveBeenCalled();
  });
});
