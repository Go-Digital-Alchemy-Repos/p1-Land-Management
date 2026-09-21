// This legacy-role fixture has no linked identities; federation HTTP coverage uses the real database separately.
vi.mock("../../services/federation-runtime", () => ({
  FEDERATION_COOKIE: "p1_federation_session",
  hasFederationHistory: async () => false,
  federationConsumer: vi.fn(),
}));
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
  fence: false,
  fenceVersion: "a".repeat(64),
  fenceBoundaryMismatch: false,
  users: new Map<string, unknown>(),
  saved: vi.fn(),
  fenceSaved: vi.fn(),
  activity: vi.fn(),
  deleted: vi.fn(),
}));
vi.mock("../../storage", () => ({
  storage: {
    users: { getUser: async (id: string) => state.users.get(id) },
    settings: {
      getSetting: async () => state.raw,
      getDecryptedCategory: async () => ({ enable_crm: String(state.enabled) }),
      getCategorySnapshot: async () => {
        if (state.fenceBoundaryMismatch)
          throw Object.assign(new Error("Boundary mismatch"), {
            code: "settings_boundary_mismatch",
          });
        return {
          values: state.fence ? { legacy_staff_crm_writes_fenced: "true" } : {},
          version: state.fenceVersion,
        };
      },
      getSettingBoundarySnapshot: async () => ({ version: state.fenceVersion }),
      upsertSettings: async (...args: unknown[]) => {
        state.fenceSaved(...args);
        state.fence = (args[0] as Array<{ value: string }>)[0].value === "true";
        state.fenceVersion =
          state.fenceVersion === "a".repeat(64) ? "b".repeat(64) : "c".repeat(64);
      },
      repairPublicSettingBoundary: async (...args: unknown[]) => {
        state.fenceSaved(...args);
        state.fence = (args[0] as { value: string }).value === "true";
        state.fenceBoundaryMismatch = false;
        state.fenceVersion = "c".repeat(64);
      },
      upsertSetting: async (...args: unknown[]) => {
        state.saved(...args);
        state.raw = args[1] as string;
        return {};
      },
      deleteSetting: state.deleted,
    },
    activity: { log: (...args: unknown[]) => state.activity(...args) },
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
    state.fence = false;
    state.fenceVersion = "a".repeat(64);
    state.fenceBoundaryMismatch = false;
    state.users.clear();
    vi.clearAllMocks();
  });
  const path = "/api/admin/crm/settings/pipeline";
  const fencePath = "/api/admin/crm/settings/legacy-staff-write-fence";
  const activationReadiness = {
    staffWritesQuiesced: true,
    inFlightStaffWritesDrained: true,
    postFenceReconciliationPlanned: true,
  };
  it("requires authentication", async () => {
    expect((await request(path)).status).toBe(401);
  });
  it("allows CRM editors to read but not write", async () => {
    expect((await request(path, "editor", "GET", undefined, ["crm"])).status).toBe(200);
    expect(
      (await request(path, "editor", "PUT", DEFAULT_CRM_PIPELINE_CONFIG, ["crm"])).status,
    ).toBe(403);
  });
  it("makes the cutover fence admin-only, audited, and recoverable without bypassing it", async () => {
    expect((await request(fencePath)).status).toBe(401);
    expect((await request(fencePath, "editor", "GET", undefined, ["crm"])).status).toBe(200);
    expect(
      (
        await request(
          fencePath,
          "editor",
          "PUT",
          {
            staffWritesFenced: true,
            expectedVersion: "a".repeat(64),
            activationReadiness,
          },
          ["crm"],
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(fencePath, "admin", "PUT", {
          staffWritesFenced: true,
          expectedVersion: "a".repeat(64),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(fencePath, "admin", "PUT", {
          staffWritesFenced: true,
          expectedVersion: "a".repeat(64),
          activationReadiness,
        })
      ).status,
    ).toBe(200);
    expect(state.fenceSaved).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ category: "crm_cutover", version: "a".repeat(64) }),
      expect.objectContaining({ action: "legacy_staff_crm_writes_fenced" }),
    );
    expect((await request(path, "admin", "PUT", DEFAULT_CRM_PIPELINE_CONFIG)).status).toBe(409);
    expect(state.saved).not.toHaveBeenCalled();
    expect(state.activity).toHaveBeenCalledWith(
      expect.any(String),
      "legacy_staff_crm_write_blocked",
      JSON.stringify({ operation: "pipeline_settings" }),
    );
    expect(
      (
        await request(fencePath, "admin", "PUT", {
          staffWritesFenced: false,
          expectedVersion: "b".repeat(64),
        })
      ).status,
    ).toBe(200);
    expect((await request(path, "admin", "PUT", DEFAULT_CRM_PIPELINE_CONFIG)).status).toBe(200);
    state.fenceBoundaryMismatch = true;
    const invalid = await request(fencePath, "admin");
    expect(await invalid.json()).toMatchObject({
      staffWritesFenced: true,
      configurationValid: false,
      issue: "boundary_mismatch",
      version: "c".repeat(64),
    });
    expect(
      (
        await request(fencePath + "/recover", "admin", "PUT", {
          staffWritesFenced: false,
          expectedVersion: "c".repeat(64),
        })
      ).status,
    ).toBe(200);
    expect(state.fenceBoundaryMismatch).toBe(false);
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
    for (const key of [CRM_PIPELINE_SETTING_KEY, "legacy_staff_crm_writes_fenced"]) {
      expect(
        (
          await request("/api/admin/settings", "admin", "PUT", {
            key,
            value: "{}",
            category: "branding",
            isSecret: true,
          })
        ).status,
      ).toBe(400);
      expect((await request(`/api/admin/settings/${key}`, "admin", "DELETE")).status).toBe(400);
    }
    expect(state.saved).not.toHaveBeenCalled();
    expect(state.deleted).not.toHaveBeenCalled();
  });
});
