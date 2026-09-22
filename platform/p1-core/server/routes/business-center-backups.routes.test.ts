import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({
  identity: null as any,
  status: vi.fn(),
  run: vi.fn(),
  restore: vi.fn(),
  log: vi.fn(),
}));
vi.mock("../services/system-backup.service", () => ({
  getBackupStatus: state.status,
  runSystemBackup: state.run,
  restoreSystemBackupFromKey: state.restore,
}));
vi.mock("../storage", () => ({ storage: { activity: { log: state.log } } }));
vi.mock("../utils/logger", () => ({ logger: { app: { warn: vi.fn(), error: vi.fn() } } }));
import router from "./business-center-backups.routes";
import { errorHandler } from "../middleware/error-handler";
const manifest = {
  schemaVersion: 1,
  key: "db/synthetic.json.gz",
  createdAt: "2026-09-19T05:00:00.000Z",
  reason: "manual",
  appVersion: "test",
  gitCommitSha: null,
  environment: "test",
  storageSource: "env",
  tableCount: 2,
  totalRowCount: 4,
  mediaAssetCount: 1,
  restoreOrder: ["private_table"],
  railwayServiceId: "private-service",
  rows: [{ private: "record" }],
};
let server: Server, base: string;
beforeEach(async () => {
  vi.clearAllMocks();
  state.identity = { active: true, role: "owner", ownerAttested: true };
  state.log.mockResolvedValue(undefined);
  state.run.mockResolvedValue(manifest);
  state.restore.mockResolvedValue(manifest);
  state.status.mockResolvedValue({
    enabled: false,
    configured: true,
    intervalHours: 24,
    retentionDays: 30,
    maxSnapshots: 10,
    storage: {
      bucketName: "synthetic",
      prefix: "client/backups",
      source: "env",
      secret: "private",
    },
    latest: manifest,
    recent: [manifest],
  });
  const app = express();
  app.use(
    express.json(),
    (req, _res, next) => {
      req.user = { id: "owner" } as any;
      req.dashboardIdentity = state.identity;
      next();
    },
    router,
    errorHandler,
  );
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterEach(async () => new Promise<void>((r) => server.close(() => r())));
const req = (path: string, method = "GET", body?: unknown) =>
  fetch(base + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
it("gates all operations before service or audit access", async () => {
  for (const identity of [
    null,
    { active: false, role: "owner", ownerAttested: true },
    { active: true, role: "member", ownerAttested: true },
    { active: true, role: "owner", ownerAttested: false },
  ]) {
    state.identity = identity;
    expect((await req("/status")).status).toBe(403);
    expect((await req("/run", "POST")).status).toBe(403);
    expect((await req("/restore", "POST", { key: manifest.key, confirmation: `RESTORE ${manifest.key}` })).status).toBe(403);
  }
  expect(state.status).not.toHaveBeenCalled();
  expect(state.run).not.toHaveBeenCalled();
  expect(state.restore).not.toHaveBeenCalled();
  expect(state.log).not.toHaveBeenCalled();
});
it("projects metadata only and distinguishes disabled scheduling from configured storage", async () => {
  const res = await req("/status");
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("private, no-store");
  const body = await res.json();
  expect(body).toMatchObject({
    enabled: false,
    configured: true,
    latest: { clientStackId: null, tableCount: 2 },
  });
  expect(JSON.stringify(body)).not.toContain("private");
  expect(body.recent).toHaveLength(1);
});
it("permits unconfigured empty history without manufacturing a backup", async () => {
  state.status.mockResolvedValue({
    enabled: true,
    configured: false,
    intervalHours: 24,
    retentionDays: 30,
    maxSnapshots: 10,
    storage: null,
    latest: null,
    recent: [],
  });
  expect(await (await req("/status")).json()).toMatchObject({
    configured: false,
    latest: null,
    recent: [],
  });
  expect(state.run).not.toHaveBeenCalled();
});
it("rejects query, injected reason/storage, and unconfirmed or injected restore requests", async () => {
  expect((await req("/status?key=private")).status).toBe(400);
  for (const body of [{ reason: "scheduled" }, { storage: "other" }, { key: "private" }])
    expect((await req("/run", "POST", body)).status).toBe(400);
  expect((await req("/restore", "POST", {})).status).toBe(400);
  expect((await req("/restore?key=other", "POST", { key: manifest.key, confirmation: `RESTORE ${manifest.key}` })).status).toBe(400);
  for (const body of [
    { key: manifest.key, confirmation: "RESTORE other" },
    { key: manifest.key, confirmation: `RESTORE ${manifest.key}`, allowLegacyBackup: true },
    { key: manifest.key, confirmation: `RESTORE ${manifest.key}`, storage: "other" },
  ]) expect((await req("/restore", "POST", body)).status).toBe(400);
  expect(state.run).not.toHaveBeenCalled();
  expect(state.restore).not.toHaveBeenCalled();
});
it("restores once through the retained service with an exact archive-key confirmation", async () => {
  const res = await req("/restore", "POST", { key: manifest.key, confirmation: `RESTORE ${manifest.key}` });
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("private, no-store");
  expect(state.restore).toHaveBeenCalledExactlyOnceWith(manifest.key);
  expect(state.log.mock.calls).toEqual([
    ["owner", "website_restore_requested", "Core database restore requested with explicit archive confirmation"],
    ["owner", "website_restore_completed", "Core database restore completed; verify live content and restart other serving replicas"],
  ]);
  const body = await res.json();
  expect(body).toMatchObject({ restored: true, manifest: { key: manifest.key, tableCount: 2 } });
  expect(JSON.stringify(body)).not.toContain("private_table");
});
it("preserves uncertain restore outcomes and never retries the retained service", async () => {
  const body = { key: manifest.key, confirmation: `RESTORE ${manifest.key}` };
  state.restore.mockRejectedValueOnce(new Error("Another backup or restore is already running"));
  expect((await req("/restore", "POST", body)).status).toBe(409);
  state.restore.mockRejectedValueOnce(new Error("private storage or identity failure"));
  const response = await req("/restore", "POST", body);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private storage");
  expect(state.restore).toHaveBeenCalledTimes(2);
});
it("requires the request audit before restore and treats a completion-audit failure as uncertain", async () => {
  const body = { key: manifest.key, confirmation: `RESTORE ${manifest.key}` };
  state.log.mockRejectedValueOnce(Error("private audit"));
  expect((await req("/restore", "POST", body)).status).toBe(503);
  expect(state.restore).not.toHaveBeenCalled();
  state.log.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error("private audit"));
  expect((await req("/restore", "POST", body)).status).toBe(503);
  expect(state.restore).toHaveBeenCalledTimes(1);
});
it("runs exactly once with authenticated intent and completion audit", async () => {
  const res = await req("/run", "POST");
  expect(res.status).toBe(201);
  expect(state.run).toHaveBeenCalledExactlyOnceWith("manual");
  expect(state.log.mock.calls).toEqual([
    [
      "owner",
      "website_backup_requested",
      "Manual Core database snapshot; configured retention applies",
    ],
    ["owner", "website_backup_completed", "Manual Core database snapshot completed"],
  ]);
  expect(state.log.mock.invocationCallOrder[0]).toBeLessThan(state.run.mock.invocationCallOrder[0]);
  expect(JSON.stringify(await res.json())).not.toContain("private");
});
it("sanitizes provider errors and preserves only the observed concurrency error", async () => {
  state.run.mockRejectedValueOnce(new Error("Another backup or restore is already running"));
  expect((await req("/run", "POST", {})).status).toBe(409);
  state.run.mockRejectedValueOnce(new Error("private object failure"));
  const res = await req("/run", "POST", {});
  expect(res.status).toBe(503);
  expect(await res.text()).not.toContain("private");
  expect(state.run).toHaveBeenCalledTimes(2);
});
it("fails before backup when intent audit fails and reports uncertain completion without retry", async () => {
  state.log.mockRejectedValueOnce(Error("private audit"));
  expect((await req("/run", "POST")).status).toBe(503);
  expect(state.run).not.toHaveBeenCalled();
  state.log.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error("private audit"));
  expect((await req("/run", "POST")).status).toBe(503);
  expect(state.run).toHaveBeenCalledTimes(1);
});
it("treats malformed stored manifests as service failures instead of client validation errors", async () => {
  state.run.mockResolvedValue({ ...manifest, createdAt: "invalid" });
  expect((await req("/run", "POST")).status).toBe(503);
});
