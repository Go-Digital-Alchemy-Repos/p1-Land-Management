import { afterEach, beforeEach, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
const state = vi.hoisted(() => ({
  identity: null as any,
  status: vi.fn(),
  run: vi.fn(),
  review: vi.fn(),
  execute: vi.fn(),
  outcome: vi.fn(),
  log: vi.fn(),
}));
vi.mock("../services/system-backup.service", () => ({
  getBackupStatus: state.status,
  runSystemBackup: state.run,
  reserveSystemBackupRestoreReview: state.review,
  restoreReviewedSystemBackup:state.execute,
  getReviewedRestoreOutcome:state.outcome,
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
  state.identity = { active: true, role: "owner", ownerAttested: true, subject:"canonical-owner" };
  state.log.mockResolvedValue(undefined);
  state.execute.mockResolvedValue(manifest);
  state.outcome.mockResolvedValue("unknown");
  state.run.mockResolvedValue(manifest);
  state.review.mockResolvedValue({ manifest, fingerprint: "a".repeat(64), operationId:receiptBody.operationId, expiresAt:receiptBody.expiresAt });
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
    expect((await req("/restore-review", "POST", { key: manifest.key, operationId:receiptBody.operationId })).status).toBe(403);
    expect((await req("/restore-execute", "POST", {})).status).toBe(403);
    expect((await req("/restore-outcome", "POST", {})).status).toBe(403);
    expect((await req("/restore-recovery-outcome", "POST", {})).status).toBe(403);
  }
  expect(state.status).not.toHaveBeenCalled();
  expect(state.review).not.toHaveBeenCalled();
  expect(state.execute).not.toHaveBeenCalled();
  expect(state.outcome).not.toHaveBeenCalled();
  expect(state.run).not.toHaveBeenCalled();
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
it("rejects query, injected reason/storage, and exposes no restore endpoint", async () => {
  expect((await req("/status?key=private")).status).toBe(400);
  for (const body of [{ reason: "scheduled" }, { storage: "other" }, { key: "private" }])
    expect((await req("/run", "POST", body)).status).toBe(400);
  expect((await req("/restore", "POST", {})).status).toBe(404);
  expect(state.run).not.toHaveBeenCalled();
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

it("reviews an archive without exposing rows, storage internals or starting a backup", async () => {
  const res = await req("/restore-review", "POST", { key: manifest.key, operationId:receiptBody.operationId });
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("private, no-store");
  const body = await res.json();
  expect(body.fingerprint).toBe("a".repeat(64));
  expect(body.manifest.key).toBe(manifest.key);
  expect(body.operationId).toBe(receiptBody.operationId);
  expect(body.expiresAt).toBe(receiptBody.expiresAt);
  expect(JSON.stringify(body)).not.toContain("private");
  expect(state.review).toHaveBeenCalledExactlyOnceWith(manifest.key,{operationId:receiptBody.operationId,actorId:"canonical-owner"});
  expect(state.run).not.toHaveBeenCalled();
  expect(state.log).not.toHaveBeenCalled();
});
it("rejects malformed or injected review requests before archive access", async () => {
  for (const body of [{}, { key: " " }, { key: "x".repeat(2049) }, { operationId:receiptBody.operationId, key: manifest.key, fingerprint: "a".repeat(64) }, { operationId:receiptBody.operationId, key: manifest.key, allowLegacy: true }, {key:manifest.key,operationId:receiptBody.operationId,actorId:"injected"}]) {
    expect((await req("/restore-review", "POST", body)).status).toBe(400);
  }
  expect((await req("/restore-review?allowLegacy=true", "POST", { key: manifest.key, operationId:receiptBody.operationId })).status).toBe(400);
  expect(state.review).not.toHaveBeenCalled();
});
it("sanitizes archive admission failures and malformed provider fingerprints", async () => {
  state.review.mockRejectedValueOnce(Error("private archive contents"));
  const res = await req("/restore-review", "POST", { key: manifest.key, operationId:receiptBody.operationId });
  expect(res.status).toBe(503);
  expect(await res.text()).not.toContain("private");
  state.review.mockResolvedValueOnce({ manifest, fingerprint: "invalid" });
  expect((await req("/restore-review", "POST", { key: manifest.key, operationId:receiptBody.operationId })).status).toBe(503);
});

const receiptBody={operationId:"11111111-1111-4111-8111-111111111111",fingerprint:"a".repeat(64),expiresAt:"2026-09-20T12:00:00Z"};
it("derives restore actor from the grant and returns only correlated outcome",async()=>{
  const response=await req("/restore-execute","POST",{...receiptBody,key:manifest.key});
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({operationId:receiptBody.operationId,outcome:"completed"});
  expect(state.execute).toHaveBeenCalledExactlyOnceWith(manifest.key,receiptBody.fingerprint,receiptBody.expiresAt,{operationId:receiptBody.operationId,actorId:"canonical-owner"});
  expect(state.outcome).not.toHaveBeenCalled();
});
it("checks outcomes without replaying and never accepts a supplied actor",async()=>{
  for(const outcome of ["unknown","not_applied","completed"]){
    state.outcome.mockResolvedValueOnce(outcome);
    const response=await req("/restore-outcome","POST",receiptBody);
    expect(await response.json()).toEqual({operationId:receiptBody.operationId,outcome});
  }
  expect(state.outcome).toHaveBeenCalledWith({...receiptBody,actorId:"canonical-owner"});
  expect(state.execute).not.toHaveBeenCalled();
  for(const path of ["/restore-execute","/restore-outcome"]){
    expect((await req(path,"POST",{...receiptBody,...(path.endsWith("execute")?{key:manifest.key}:{}),actorId:"injected"})).status).toBe(400);
  }
});

it("reconciles abandoned-owner evidence with an audited canonical acting owner and never executes",async()=>{
  state.outcome.mockResolvedValue("not_applied");
  const response=await req("/restore-recovery-outcome","POST",{...receiptBody,originalActorId:"former-owner"});
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({operationId:receiptBody.operationId,outcome:"not_applied"});
  expect(state.outcome).toHaveBeenCalledExactlyOnceWith({...receiptBody,actorId:"former-owner"});
  expect(state.execute).not.toHaveBeenCalled();
  const details={actingOwnerId:"canonical-owner",originalActorId:"former-owner",operationId:receiptBody.operationId};
  expect(state.log.mock.calls).toEqual([
    ["owner","website_restore_recovery_requested",JSON.stringify(details)],
    ["owner","website_restore_recovery_checked",JSON.stringify({...details,outcome:"not_applied"})],
  ]);
  expect(state.log.mock.invocationCallOrder[0]).toBeLessThan(state.outcome.mock.invocationCallOrder[0]);
  expect(state.log.mock.invocationCallOrder[1]).toBeGreaterThan(state.outcome.mock.invocationCallOrder[0]);
  expect(JSON.stringify(state.log.mock.calls)).not.toContain(receiptBody.fingerprint);
});
it("rejects recovery actor spoofing on normal endpoints and malformed recovery bodies",async()=>{
  for(const path of ["/restore-execute","/restore-outcome"]){
    expect((await req(path,"POST",{...receiptBody,...(path.endsWith("execute")?{key:manifest.key}:{}),originalActorId:"former-owner"})).status).toBe(400);
  }
  for(const body of [receiptBody,{...receiptBody,originalActorId:""},{...receiptBody,originalActorId:"x".repeat(256)},{...receiptBody,originalActorId:"former-owner",actorId:"injected"}]){
    expect((await req("/restore-recovery-outcome","POST",body)).status).toBe(400);
  }
  expect((await req("/restore-recovery-outcome?execute=true","POST",{...receiptBody,originalActorId:"former-owner"})).status).toBe(400);
  expect(state.outcome).not.toHaveBeenCalled();
  expect(state.execute).not.toHaveBeenCalled();
  expect(state.log).not.toHaveBeenCalled();
});
it("fails recovery closed on intent or completion audit failure without replaying execution",async()=>{
  const body={...receiptBody,originalActorId:"former-owner"};
  state.log.mockRejectedValueOnce(Error("private intent failure"));
  expect((await req("/restore-recovery-outcome","POST",body)).status).toBe(503);
  expect(state.outcome).not.toHaveBeenCalled();
  state.log.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error("private completion failure"));
  const response=await req("/restore-recovery-outcome","POST",body);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private");
  expect(state.outcome).toHaveBeenCalledTimes(1);
  expect(state.execute).not.toHaveBeenCalled();
});
