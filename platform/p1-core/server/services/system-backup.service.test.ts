const reviewedIdentity={operationId:"11111111-1111-4111-8111-111111111111",actorId:"synthetic-owner"};
import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ pool: { connect: vi.fn(), query: vi.fn() } }));
vi.mock("../utils/logger", () => ({
  logger: { backup: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } },
}));
vi.mock("./backup-storage.service", () => ({
  beginBackupStorageOperation: vi.fn(),
  deleteBackupObject: vi.fn(),
  downloadBackupObject: vi.fn(),
  getBackupStorageInfo: vi.fn(),
  isBackupStorageConfigured: vi.fn(),
  listBackupObjects: vi.fn(),
  uploadBackupObject: vi.fn(),
}));

import type { PoolClient } from "pg";
import { pool } from "../db";
import * as storage from "./backup-storage.service";
import { getBackupStatus, listRecentBackupManifests, runSystemBackup, serializeRestoreValue, getSystemBackupRestoreReview, restoreReviewedSystemBackup } from "./system-backup.service";

describe("serializeRestoreValue", () => {
  it("preserves JSON arrays and objects as JSON parameters during restore", () => {
    const jsonColumns = new Set(["items", "metadata"]);

    expect(serializeRestoreValue([{ id: "home" }], jsonColumns, "items")).toBe('[{"id":"home"}]');
    expect(serializeRestoreValue({ enabled: true }, jsonColumns, "metadata")).toBe(
      '{"enabled":true}',
    );
  });

  it("leaves ordinary values and JSON nulls unchanged", () => {
    const jsonColumns = new Set(["items"]);

    expect(serializeRestoreValue("navigation", jsonColumns, "name")).toBe("navigation");
    expect(serializeRestoreValue(null, jsonColumns, "items")).toBeNull();
  });
});

const validManifest = {
  schemaVersion: 1, key: "db/fixture.json.gz", createdAt: "2026-09-19T00:00:00Z", clientStackId: "p1-land-management",
  reason: "manual", appVersion: "test", environment: "test", storageSource: "env", bucketName: "test", bucketPrefix: "test",
  gitCommitSha: null, railwayEnvironment: null, railwayProjectId: null, railwayServiceId: null,
  tableCount: 0, totalRowCount: 0, mediaAssetCount: 0, restoreOrder: [],
};

describe("backup session cleanup failures", () => {
  const query = vi.fn();
  const release = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pool.connect as () => Promise<PoolClient>).mockResolvedValue({
      query,
      release,
    } as unknown as PoolClient);
    vi.mocked(storage.beginBackupStorageOperation).mockResolvedValue({ source: "env", bucketName: "test", prefix: "test" });
    vi.mocked(storage.isBackupStorageConfigured).mockResolvedValue(true);
    vi.mocked(storage.getBackupStorageInfo).mockResolvedValue({
      source: "env",
      bucketName: "test",
      prefix: "test",
    });
    vi.mocked(storage.listBackupObjects).mockResolvedValue([]);
    vi.mocked(storage.uploadBackupObject).mockImplementation(async (key) => ({ key }));
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ acquired: true }] };
      if (sql.includes("pg_advisory_unlock")) return { rows: [{ released: true }] };
      return { rows: [] };
    });
  });

  it("does not prune a partially enumerated inventory when listing fails", async () => {
    vi.mocked(storage.listBackupObjects).mockRejectedValueOnce(Error("Malformed backup pagination token"));
    await expect(runSystemBackup()).rejects.toThrow("pagination token");
    expect(storage.deleteBackupObject).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("returns qualified history keys from the actual object rather than its embedded relative key", async () => {
    const key = "clients/p1.example/backups/db/fixture.json.gz";
    vi.mocked(storage.listBackupObjects).mockResolvedValue([{ key, size: 1, lastModified: "2026-09-19T00:00:00Z" }]);
    vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify({ manifest: validManifest })));
    const result = await listRecentBackupManifests(1);
    expect(result[0].key).toBe(key);
    expect(result[0].clientStackId).toBe("p1-land-management");
    expect(storage.downloadBackupObject).toHaveBeenCalledWith(key, expect.objectContaining({ bucketName: "test" }));
  });

  it("shares one archive read between latest and recent status", async () => {
    const key = "clients/p1.example/backups/db/fixture.json.gz";
    vi.mocked(storage.listBackupObjects).mockResolvedValue([{ key, size: 1, lastModified: "2026-09-19T00:00:00Z" }]);
    vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify({ manifest: validManifest })));
    const result = await getBackupStatus();
    expect(result.latest).toEqual(result.recent[0]);
    expect(result.latest?.key).toBe(key);
    expect(storage.listBackupObjects).toHaveBeenCalledTimes(1);
    expect(storage.downloadBackupObject).toHaveBeenCalledTimes(1);
    const operation = vi.mocked(storage.beginBackupStorageOperation).mock.results[0].value;
    const captured = await operation;
    expect(storage.beginBackupStorageOperation).toHaveBeenCalledTimes(1);
    expect(storage.getBackupStorageInfo).toHaveBeenCalledWith(captured);
    expect(storage.listBackupObjects).toHaveBeenCalledWith("db", 20, captured);
    expect(storage.downloadBackupObject).toHaveBeenCalledWith(key, captured);
  });

  it.each([
    null, Buffer.from("not gzip"), gzipSync("not json"),
    gzipSync(JSON.stringify({ manifest: { ...validManifest, schemaVersion: 2 } })),
    gzipSync(JSON.stringify({ manifest: { ...validManifest, createdAt: "invalid" } })),
    gzipSync(JSON.stringify({ manifest: { ...validManifest, tableCount: -1 } })),
    gzipSync(JSON.stringify({ manifest: { schemaVersion: 1 } })),
  ])("fails closed for unreadable or invalid candidate history", async archive => {
    vi.mocked(storage.listBackupObjects).mockResolvedValue([{ key: "test/db/archive.json.gz", size: 1, lastModified: null }]);
    vi.mocked(storage.downloadBackupObject).mockResolvedValue(archive);
    await expect(getBackupStatus()).rejects.toThrow("unreadable or invalid archive");
  });

  it("sanitizes provider failures instead of silently dropping a candidate", async () => {
    vi.mocked(storage.listBackupObjects).mockResolvedValue([{ key: "test/db/archive.json.gz", size: 1, lastModified: null }]);
    vi.mocked(storage.downloadBackupObject).mockRejectedValueOnce(Error("credential-like provider body"));
    await expect(listRecentBackupManifests()).rejects.toThrow(/^Backup history contains an unreadable or invalid archive$/);
  });

  it("pins one operation through snapshot, latest manifest, retention listing and deletion", async () => {
    const operation = { source: "env" as const, bucketName: "original", prefix: "original" };
    vi.mocked(storage.beginBackupStorageOperation).mockResolvedValueOnce(operation);
    vi.mocked(storage.listBackupObjects).mockResolvedValue([{ key: "original/db/old.json.gz", size: 1, lastModified: "2000-01-01T00:00:00Z" }]);
    const manifest = await runSystemBackup();
    expect(manifest.bucketName).toBe("original");
    expect(storage.beginBackupStorageOperation).toHaveBeenCalledTimes(1);
    expect(vi.mocked(storage.uploadBackupObject).mock.calls.every(call => call[4] === operation)).toBe(true);
    expect(storage.listBackupObjects).toHaveBeenCalledWith("db", 500, operation);
    expect(storage.deleteBackupObject).toHaveBeenCalledWith("original/db/old.json.gz", operation);
  });

  it("discards a session when unlock reports that it did not release the lock", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ acquired: true }] };
      if (sql.includes("pg_advisory_unlock")) return { rows: [{ released: false }] };
      return { rows: [] };
    });
    await expect(runSystemBackup()).rejects.toThrow("Backup lock release failed");
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("preserves an export failure when unlock also fails and evicts the connection", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ acquired: true }] };
      if (sql.includes("FROM pg_tables")) throw new Error("read failed");
      if (sql.includes("pg_advisory_unlock")) throw new Error("unlock failed");
      return { rows: [] };
    });
    await expect(runSystemBackup()).rejects.toThrow("read failed");
    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(storage.uploadBackupObject).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("evicts the session if lock acquisition has an uncertain outcome", async () => {
    query.mockRejectedValueOnce(new Error("connection interrupted"));
    await expect(runSystemBackup()).rejects.toThrow("connection interrupted");
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("returns a healthy session after a denied lock without running an export", async () => {
    query.mockResolvedValueOnce({ rows: [{ acquired: false }] });
    await expect(runSystemBackup()).rejects.toThrow("Another backup or restore");
    expect(release).toHaveBeenCalledExactlyOnceWith(false);
    expect(query).toHaveBeenCalledTimes(1);
    expect(storage.uploadBackupObject).not.toHaveBeenCalled();
  });
});


describe("reviewed backup restore admission", () => {
  it("reviews content without database access and fingerprints all rows", async () => {
    vi.clearAllMocks();
    const previous = process.env.CLIENT_STACK_ID;
    process.env.CLIENT_STACK_ID = "p1-land-management";
    try {
      vi.mocked(storage.beginBackupStorageOperation).mockResolvedValue({ source: "env", bucketName: "test", prefix: "test" });
      const snapshot = { manifest: {...validManifest,tableCount:1,restoreOrder:["example"]}, tables: [{name:"example",rowCount:0,rows:[]}], sequences: [] };
      vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify(snapshot)));
      const first = await getSystemBackupRestoreReview(validManifest.key);
      expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(first).not.toHaveProperty("tables");
      vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify({...snapshot, manifest:{...snapshot.manifest,totalRowCount:1}, tables:[{name:"example",rows:[{id:1}],rowCount:1}]})));
      expect((await getSystemBackupRestoreReview(validManifest.key)).fingerprint).not.toBe(first.fingerprint);
      expect(pool.connect).not.toHaveBeenCalled();
    } finally { if(previous === undefined) delete process.env.CLIENT_STACK_ID; else process.env.CLIENT_STACK_ID=previous; }
  });
  it("rejects replaced archives under the operation lock before starting restore SQL", async () => {
    vi.clearAllMocks();
    const previous = process.env.CLIENT_STACK_ID;
    process.env.CLIENT_STACK_ID = "p1-land-management";
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("pg_try_advisory_lock")) return {rows:[{acquired:true}]};
      if (sql.includes("pg_advisory_unlock")) return {rows:[{released:true}]};
      throw Error("Restore SQL must not execute");
    });
    const release = vi.fn();
    vi.mocked(pool.connect as () => Promise<PoolClient>).mockResolvedValue({query,release} as unknown as PoolClient);
    vi.mocked(storage.beginBackupStorageOperation).mockResolvedValue({source:"env",bucketName:"test",prefix:"test"});
    try {
      vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify({manifest:{...validManifest,tableCount:1,restoreOrder:["example"]},tables:[{name:"example",rowCount:0,rows:[]}],sequences:[]})));
      const review = await getSystemBackupRestoreReview(validManifest.key);
      vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify({manifest:{...validManifest,tableCount:1,totalRowCount:1,restoreOrder:["example"]},tables:[{name:"example",rowCount:1,rows:[{id:1}]}],sequences:[]})));
      await expect(restoreReviewedSystemBackup(validManifest.key,review.fingerprint,new Date(Date.now()+60_000).toISOString(),reviewedIdentity)).rejects.toThrow("changed after review");
      expect(query).toHaveBeenCalledTimes(2);
      expect(release).toHaveBeenCalledWith(false);
    } finally { if(previous === undefined) delete process.env.CLIENT_STACK_ID; else process.env.CLIENT_STACK_ID=previous; }
  });
  it("rejects missing review before storage or database access", async () => {
    vi.clearAllMocks();
    await expect(restoreReviewedSystemBackup(validManifest.key, "",new Date(Date.now()+60_000).toISOString(),reviewedIdentity)).rejects.toThrow("review is required");
    expect(storage.beginBackupStorageOperation).not.toHaveBeenCalled();
    expect(pool.connect).not.toHaveBeenCalled();
  });
});

it("rejects expired, missing and excessive reviewed execution deadlines before storage", async () => {
  vi.clearAllMocks();
  for (const deadline of ["", "invalid", new Date(Date.now()-1).toISOString(),new Date(Date.now()+600_000).toISOString()])
    await expect(restoreReviewedSystemBackup(validManifest.key,"a".repeat(64),deadline,reviewedIdentity)).rejects.toThrow("review expired or invalid");
  expect(storage.beginBackupStorageOperation).not.toHaveBeenCalled();
  expect(pool.connect).not.toHaveBeenCalled();
});
it("rechecks expiry after archive download and after transaction lock waits, before destructive SQL", async () => {
  const previous=process.env.CLIENT_STACK_ID;
  process.env.CLIENT_STACK_ID="p1-land-management";
  const instant=Date.parse("2026-09-20T12:00:00Z");
  const clock=vi.spyOn(Date,"now").mockReturnValue(instant);
  const snapshot={manifest:{...validManifest,tableCount:1,restoreOrder:["example"]},tables:[{name:"example",rowCount:0,rows:[]}],sequences:[]};
  try {
    for(const delayed of ["download","transaction-lock"]){
      vi.clearAllMocks();clock.mockReturnValue(instant);
      vi.mocked(storage.beginBackupStorageOperation).mockResolvedValue({source:"env",bucketName:"test",prefix:"test"});
      vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify(snapshot)));
      const review=await getSystemBackupRestoreReview(validManifest.key);
      const query=vi.fn(async(sql:string)=>{
        if(sql.includes("INSERT INTO p1_operations.restore_receipts")) return {rows:[{operation_id:reviewedIdentity.operationId}]};
    if(sql.includes("pg_try_advisory_lock")) return {rows:[{acquired:true}]};
        if(sql.includes("pg_advisory_unlock")) return {rows:[{released:true}]};
        if(delayed==="transaction-lock" && sql.includes("blog-publication-writes")) clock.mockReturnValue(instant+61_000);
        return {rows:[]};
      });
      vi.mocked(pool.connect as () => Promise<PoolClient>).mockResolvedValue({query,release:vi.fn()} as unknown as PoolClient);
      vi.mocked(storage.downloadBackupObject).mockImplementation(async()=>{
        if(delayed==="download") clock.mockReturnValue(instant+61_000);
        return gzipSync(JSON.stringify(snapshot));
      });
      await expect(restoreReviewedSystemBackup(validManifest.key,review.fingerprint,new Date(instant+60_000).toISOString(),reviewedIdentity)).rejects.toThrow("review expired or invalid");
      expect(query.mock.calls.some(([sql])=>/TRUNCATE|INSERT INTO public/.test(sql))).toBe(false);
      if(delayed==="transaction-lock") expect(query.mock.calls.some(([sql])=>sql==="ROLLBACK")).toBe(true);
    }
  } finally { clock.mockRestore();if(previous===undefined) delete process.env.CLIENT_STACK_ID;else process.env.CLIENT_STACK_ID=previous; }
});
it("rejects reviewed archives missing current tables before truncation", async () => {
  vi.clearAllMocks();
  const previous=process.env.CLIENT_STACK_ID;
  process.env.CLIENT_STACK_ID="p1-land-management";
  const query=vi.fn(async(sql:string)=>{
    if(sql.includes("INSERT INTO p1_operations.restore_receipts")) return {rows:[{operation_id:reviewedIdentity.operationId}]};
    if(sql.includes("pg_try_advisory_lock")) return {rows:[{acquired:true}]};
    if(sql.includes("pg_advisory_unlock")) return {rows:[{released:true}]};
    if(sql.includes("FROM pg_tables")) return {rows:[{table_name:"example"},{table_name:"newer_customer_data"}]};
    return {rows:[]};
  });
  vi.mocked(pool.connect as () => Promise<PoolClient>).mockResolvedValue({query,release:vi.fn()} as unknown as PoolClient);
  vi.mocked(storage.beginBackupStorageOperation).mockResolvedValue({source:"env",bucketName:"test",prefix:"test"});
  vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify({manifest:{...validManifest,tableCount:1,restoreOrder:["example"]},tables:[{name:"example",rowCount:0,rows:[]}],sequences:[]})));
  try {
    const review=await getSystemBackupRestoreReview(validManifest.key);
    await expect(restoreReviewedSystemBackup(validManifest.key,review.fingerprint,new Date(Date.now()+60_000).toISOString(),reviewedIdentity)).rejects.toThrow("table inventory differs");
    expect(query.mock.calls.some(([sql])=>sql.startsWith("TRUNCATE"))).toBe(false);
    expect(query.mock.calls.some(([sql])=>sql==="ROLLBACK")).toBe(true);
  } finally { if(previous===undefined) delete process.env.CLIENT_STACK_ID;else process.env.CLIENT_STACK_ID=previous; }
});
it("never cascades reviewed truncation into excluded or new relations", async () => {
  vi.clearAllMocks();
  const previous=process.env.CLIENT_STACK_ID;
  process.env.CLIENT_STACK_ID="p1-land-management";
  const query=vi.fn(async(sql:string)=>{
    if(sql.includes("INSERT INTO p1_operations.restore_receipts")) return {rows:[{operation_id:reviewedIdentity.operationId}]};
    if(sql.includes("pg_try_advisory_lock")) return {rows:[{acquired:true}]};
    if(sql.includes("pg_advisory_unlock")) return {rows:[{released:true}]};
    if(sql.includes("FROM pg_tables")) return {rows:[{table_name:"example"},{table_name:"session"}]};
    if(sql.startsWith("TRUNCATE")) throw Error("Synthetic referencing relation denial");
    return {rows:[]};
  });
  vi.mocked(pool.connect as () => Promise<PoolClient>).mockResolvedValue({query,release:vi.fn()} as unknown as PoolClient);
  vi.mocked(storage.beginBackupStorageOperation).mockResolvedValue({source:"env",bucketName:"test",prefix:"test"});
  vi.mocked(storage.downloadBackupObject).mockResolvedValue(gzipSync(JSON.stringify({manifest:{...validManifest,tableCount:1,restoreOrder:["example"]},tables:[{name:"example",rowCount:0,rows:[]}],sequences:[]})));
  try {
    const review=await getSystemBackupRestoreReview(validManifest.key);
    await expect(restoreReviewedSystemBackup(validManifest.key,review.fingerprint,new Date(Date.now()+60_000).toISOString(),reviewedIdentity)).rejects.toThrow("referencing relation denial");
    const sql=query.mock.calls.find(([sql])=>sql.startsWith("TRUNCATE"))?.[0];
    expect(sql).toBe('TRUNCATE TABLE public."example" RESTART IDENTITY');
    expect(query.mock.calls.some(([sql])=>sql==="ROLLBACK")).toBe(true);
    expect(query.mock.calls.some(([sql])=>sql==="COMMIT")).toBe(false);
  } finally { if(previous===undefined) delete process.env.CLIENT_STACK_ID;else process.env.CLIENT_STACK_ID=previous; }
});
