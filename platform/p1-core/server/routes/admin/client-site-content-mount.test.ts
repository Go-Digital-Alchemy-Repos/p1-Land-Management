// This legacy-role fixture has no linked identities; federation HTTP coverage uses the real database separately.
vi.mock("../../services/federation-runtime", () => ({ FEDERATION_COOKIE:"p1_federation_session", hasFederationHistory:async()=>false, federationConsumer:vi.fn() }));
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { User } from "@shared/schema";
const state = vi.hoisted(() => ({
  enabled: true,
  users: new Map<string, unknown>(),
  get: vi.fn(),
}));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("../../storage", () => ({
  storage: {
    users: { getUser: async (id: string) => state.users.get(id) },
    settings: { getDecryptedCategory: async () => ({ enable_cms: String(state.enabled) }) },
    clientSiteContent: { get: state.get },
  },
}));
vi.mock("../../storage/index", async () => await import("../../storage"));
vi.mock("../../utils/logger", () => ({
  logger: { app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, cms: { error: vi.fn() } },
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
vi.mock("./crm.routes", () => ({ default: express.Router() }));
vi.mock("./client-stack-onboarding.routes", () => ({ default: express.Router() }));
vi.mock("../../services/email.service", () => ({}));
vi.mock("../../services/r2.service", () => ({}));
vi.mock("../../services/system-email-templates.service", () => ({}));
vi.mock("../../services/mailchimp.service", () => ({}));
vi.mock("../../services/image-optimizer", () => ({}));
vi.mock("../../services/cms-media-upload.service", () => ({}));
import adminRouter from "./index";
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
describe("actual mounted client site content permissions", () => {
  beforeAll(async () => {
    const app = express();
    app.use(express.json(), cookieParser());
    app.use("/api/admin", adminRouter);
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
    vi.stubEnv(
      "CLIENT_SITE_MANIFEST_PATH",
      "docs/pilots/better-farms/client-site-manifest.example.json",
    );
    state.enabled = true;
    state.users.clear();
    state.get.mockReset();
    state.get.mockResolvedValue(undefined);
  });
  afterAll(() => vi.unstubAllEnvs());
  const path = "/api/admin/client-site-content/fund-a-farm/fund-a-farm-page";
  it("allows content editors through real content router and manifest serialization", async () => {
    const result = await request(path, "editor", "GET", undefined, ["content"]);
    expect(result.status).toBe(200);
    expect((await result.json()).previewUrl).toBe("https://better-farms.example/fund-a-farm?cmsPreview=1&cmsComponent=fund-a-farm-page");
    expect(state.get).toHaveBeenCalledOnce();
  });
  it("allows administrators", async () => {
    expect((await request(path, "admin")).status).toBe(200);
  });
  it("requires authentication", async () => {
    expect((await request(path)).status).toBe(401);
  });
  it("denies unrelated editors and clients before storage", async () => {
    expect((await request(path, "editor", "GET", undefined, ["crm"])).status).toBe(403);
    expect((await request(path, "client")).status).toBe(403);
    expect(state.get).not.toHaveBeenCalled();
  });
  it("honors the CMS feature gate", async () => {
    state.enabled = false;
    for (const role of ["admin", "editor"])
      expect((await request(path, role, "GET", undefined, ["content"])).status).toBe(404);
    expect(state.get).not.toHaveBeenCalled();
  });
  it("keeps unrelated admin routes protected", async () => {
    for (const other of [
      "/dashboard-stats",
      "/users",
      "/client-stack-onboarding",
    ]) {
      expect(
        (await request("/api/admin" + other, "editor", "GET", undefined, ["content"])).status,
      ).toBe(403);
    }
  });
});
