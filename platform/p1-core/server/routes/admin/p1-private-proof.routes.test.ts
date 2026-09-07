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
  proof: null as any,
  rows: [] as any[],
  enabled: true,
  users: new Map<string, unknown>(),
  saved: vi.fn(),
  deleted: vi.fn(),
}));
vi.mock("../../storage", () => ({
  storage: {
    users: { getUser: async (id: string) => state.users.get(id) },
    settings: {
      readPrivateJson: async () => state.proof,
      updatePrivateJson: async (_k: unknown, _c: unknown, apply: (value: unknown) => unknown) => {
        const next = apply(state.proof);
        state.proof = next;
        return next;
      },
      getAllSettings: async () => state.rows,
      getSetting: async () => state.raw,
      getDecryptedCategory: async () => ({
        enable_crm: String(state.enabled),
        enable_cms: String(state.enabled),
      }),
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

import {
  emptyProofDraft,
  PRIVATE_PROOF_KEY,
  PRIVATE_PROOF_CATEGORY,
} from "@shared/p1-private-proof";
describe("private proof boundary", () => {
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
    state.proof = null;
    state.rows = [];
    state.enabled = true;
    state.users.clear();
    vi.clearAllMocks();
  });
  const path = "/api/admin/cms/private-proof";
  const save = {
    revision: 0,
    index: 0,
    action: "save",
    draft: { ...emptyProofDraft, title: "Private marker" },
  };
  it("enforces authentication and explicit content permissions", async () => {
    expect((await request(path)).status).toBe(401);
    expect((await request(path, "client")).status).toBe(403);
    expect((await request(path, "editor", "GET", undefined, ["crm"])).status).toBe(403);
    expect((await request(path, "editor", "GET", undefined, ["content"])).status).toBe(200);
    expect((await request(path, "editor", "PUT", save, ["content"])).status).toBe(200);
    expect(
      (
        await request(path, "editor", "PUT", { revision: 1, index: 0, action: "approve" }, [
          "content",
        ])
      ).status,
    ).toBe(403);
  });
  it("rejects stale saves and retains committed history", async () => {
    const first = await request(path, "admin", "PUT", save);
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toContain("no-store");
    expect((await request(path, "admin", "PUT", save)).status).toBe(409);
    expect(state.proof.revision).toBe(1);
    expect(state.proof.history).toHaveLength(1);
    expect(
      (await request(path, "admin", "PUT", { revision: 1, index: 0, action: "approve" })).status,
    ).toBe(400);
    expect(
      (await request(path, "admin", "PUT", { revision: 1, index: 0, action: "revoke" })).status,
    ).toBe(200);
    expect(state.proof.history).toHaveLength(2);
  });
  it("binds approval and revocation to immutable audit versions; edits invalidate approval", async () => {
    const draft = {
      ...emptyProofDraft,
      title: "Owner supplied evidence",
      scope: "Specified scope",
      sourceUrl: "https://example.com/evidence",
      sourceOwner: "Owner",
      technicalReviewer: "Reviewer",
      reviewedDate: "2026-01-01",
      permission: "granted",
      permissionScope: "Specific excerpt only",
      publicExcerpt: "Reviewed excerpt",
    };
    expect((await request(path, "admin", "PUT", { ...save, draft })).status).toBe(200);
    expect(
      (await request(path, "admin", "PUT", { revision: 1, index: 0, action: "approve" })).status,
    ).toBe(200);
    const approval = structuredClone(state.proof.history[1]);
    expect(state.proof.records[0].status).toBe("approved");
    expect(approval.draftDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(
      (
        await request(
          path,
          "editor",
          "PUT",
          { ...save, revision: 2, draft: { ...draft, title: "Changed" } },
          ["content"],
        )
      ).status,
    ).toBe(200);
    expect(state.proof.records[0].status).toBe("draft");
    expect(state.proof.history[1]).toEqual(approval);
    expect(state.proof.records[0].reviewer).toBeUndefined();
    state.proof.history = Array.from({ length: 10000 }, () => approval);
    expect((await request(path, "admin", "PUT", { ...save, revision: 3 })).status).toBe(409);
    expect(state.proof.history).toHaveLength(10000);
  });
  it("rejects untrusted sources, oversized metadata and injected history", async () => {
    for (const sourceUrl of [
      "http://example.com/a",
      "https://127.0.0.1/a",
      "https://localhost/a",
      "https://example.com/a?token=private",
      "https://user:pass@example.com/a",
      "https://a.internal/a",
    ]) {
      expect(
        (await request(path, "admin", "PUT", { ...save, draft: { ...save.draft, sourceUrl } }))
          .status,
      ).toBe(400);
    }
    expect(
      (
        await request(path, "admin", "PUT", {
          ...save,
          draft: { ...save.draft, title: "a".repeat(2001) },
        })
      ).status,
    ).toBe(400);
    expect((await request(path, "admin", "PUT", { ...save, history: [] })).status).toBe(400);
    expect(state.proof).toBe(null);
  });
  it("blocks generic settings reads writes deletion and category movement", async () => {
    state.rows = [
      {
        key: PRIVATE_PROOF_KEY,
        category: PRIVATE_PROOF_CATEGORY,
        value: "private marker",
        isSecret: true,
      },
      { key: "legacy-private", category: PRIVATE_PROOF_CATEGORY, value: "marker", isSecret: false },
    ];
    const get = await request("/api/admin/settings", "admin");
    expect(await get.json()).toEqual({});
    for (const body of [
      { key: PRIVATE_PROOF_KEY, category: "branding" },
      { key: " P1_PRIVATE_PROOF_INVENTORY ", category: "branding" },
      { key: "other", category: " P1_PRIVATE_PROOF " },
      { key: "legacy-private", category: "branding" },
    ]) {
      expect(
        (
          await request("/api/admin/settings", "admin", "PUT", {
            ...body,
            value: "leak",
            isSecret: false,
          })
        ).status,
      ).toBe(403);
    }
    for (const key of [PRIVATE_PROOF_KEY, "legacy-private"]) {
      expect((await request("/api/admin/settings/" + key, "admin", "DELETE")).status).toBe(403);
    }
    expect(state.saved).not.toHaveBeenCalled();
    expect(state.deleted).not.toHaveBeenCalled();
  });
});
