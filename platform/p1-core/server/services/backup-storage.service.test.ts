import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.fn();
const MockS3Client = vi.fn(() => ({ send: mockSend }));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: MockS3Client,
  PutObjectCommand: vi.fn((params: unknown) => ({ type: "PutObject", ...(params as object) })),
  DeleteObjectCommand: vi.fn((params: unknown) => ({
    type: "DeleteObject",
    ...(params as object),
  })),
  ListObjectsV2Command: vi.fn((params: unknown) => ({
    type: "ListObjectsV2",
    ...(params as object),
  })),
  GetObjectCommand: vi.fn((params: unknown) => ({ type: "GetObject", ...(params as object) })),
}));

vi.mock("../utils/logger", () => ({
  logger: { backup: { warn: vi.fn(), info: vi.fn(), error: vi.fn() }, r2: { warn: vi.fn() } },
}));

describe("backup storage service client isolation", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.BACKUP_R2_ACCOUNT_ID = "acct";
    process.env.BACKUP_R2_ACCESS_KEY_ID = "key";
    process.env.BACKUP_R2_SECRET_ACCESS_KEY = "secret";
    process.env.BACKUP_R2_BUCKET_NAME = "core-platform-website-backups";
    process.env.BACKUP_R2_PREFIX = "clients/alpha.example/backups";

    const mod = await import("./backup-storage.service");
    mod.resetBackupStorageClient();
  });

  it("only downloads objects from the active client backup prefix", async () => {
    mockSend.mockResolvedValue({
      Body: { transformToByteArray: async () => Uint8Array.from([1]) },
    });
    const mod = await import("./backup-storage.service");

    await expect(
      mod.downloadBackupObject("clients/beta.example/backups/snapshots/other.json.gz"),
    ).resolves.toBeNull();
    expect(mockSend).not.toHaveBeenCalled();

    await expect(
      mod.downloadBackupObject("clients/alpha.example/backups/snapshots/current.json.gz"),
    ).resolves.toEqual(Buffer.from([1]));
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ Key: "clients/alpha.example/backups/snapshots/current.json.gz" }),
    );
  });

  it("rejects traversal and cross-client keys before upload, listing, or deletion", async () => {
    const mod = await import("./backup-storage.service");

    await expect(
      mod.uploadBackupObject(
        "../snapshots/escape.json.gz",
        Buffer.from("data"),
        "application/json",
      ),
    ).resolves.toBeNull();
    await expect(mod.listBackupObjects("../other-client")).resolves.toEqual([]);
    await mod.deleteBackupObject("clients/beta.example/backups/snapshots/other.json.gz");

    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("complete backup object enumeration", () => {
  const prefix = "clients/alpha.example/backups/db/";
  beforeEach(async () => {
    vi.clearAllMocks();
    mockSend.mockReset();
    Object.assign(process.env, { BACKUP_R2_ACCOUNT_ID: "acct", BACKUP_R2_ACCESS_KEY_ID: "key", BACKUP_R2_SECRET_ACCESS_KEY: "secret", BACKUP_R2_BUCKET_NAME: "fixture", BACKUP_R2_PREFIX: "clients/alpha.example/backups" });
    (await import("./backup-storage.service")).resetBackupStorageClient();
  });
  it("follows all pages before sorting latest objects, even beyond the requested page size", async () => {
    mockSend.mockResolvedValueOnce({ IsTruncated: true, NextContinuationToken: "page-two", Contents: [{ Key: prefix + "old.json.gz", LastModified: new Date("2026-01-01") }] });
    mockSend.mockResolvedValueOnce({ IsTruncated: false, Contents: [{ Key: prefix + "new.json.gz", LastModified: new Date("2026-09-19") }] });
    const { listBackupObjects } = await import("./backup-storage.service");
    const result = await listBackupObjects("db", 1);
    expect(result.map(item => item.key)).toEqual([prefix + "new.json.gz", prefix + "old.json.gz"]);
    expect(mockSend.mock.calls[1][0]).toEqual(expect.objectContaining({ MaxKeys: 1, ContinuationToken: "page-two", Prefix: prefix.slice(0, -1) }));
  });
  it.each([undefined, "", 123, "bad\nvalue"])("rejects a truncated response with malformed token %s without returning partial results", async token => {
    mockSend.mockResolvedValueOnce({ IsTruncated: true, NextContinuationToken: token, Contents: [] });
    const { listBackupObjects } = await import("./backup-storage.service");
    await expect(listBackupObjects("db")).rejects.toThrow("pagination token");
  });
  it.each([{}, { IsTruncated: undefined }, { IsTruncated: null }, { IsTruncated: "true" }, { IsTruncated: false, Contents: {} }])("rejects malformed page metadata %j", async response => {
    mockSend.mockResolvedValueOnce(response);
    const { listBackupObjects } = await import("./backup-storage.service");
    await expect(listBackupObjects("db")).rejects.toThrow("Malformed backup listing response");
  });
  it("rejects duplicate keys across pages rather than pruning an ambiguous inventory", async () => {
    const Contents = [{ Key: prefix + "same.json.gz" }];
    mockSend.mockResolvedValueOnce({ IsTruncated: true, NextContinuationToken: "next", Contents });
    mockSend.mockResolvedValueOnce({ IsTruncated: false, Contents });
    const { listBackupObjects } = await import("./backup-storage.service");
    await expect(listBackupObjects("db")).rejects.toThrow("duplicate");
  });
  it("rejects repeated continuation tokens instead of looping", async () => {
    mockSend.mockResolvedValue({ IsTruncated: true, NextContinuationToken: "same", Contents: [] });
    const { listBackupObjects } = await import("./backup-storage.service");
    await expect(listBackupObjects("db")).rejects.toThrow("repeated");
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
  it("rejects a failed second page and foreign keys rather than exposing partial enumeration", async () => {
    const { listBackupObjects } = await import("./backup-storage.service");
    mockSend.mockResolvedValueOnce({ IsTruncated: true, NextContinuationToken: "next", Contents: [{ Key: prefix + "first.json.gz" }] }).mockRejectedValueOnce(Error("network"));
    await expect(listBackupObjects("db")).rejects.toThrow("network");
    mockSend.mockResolvedValueOnce({ IsTruncated: false, Contents: [{ Key: "clients/beta.example/backups/db/foreign.json.gz" }] });
    await expect(listBackupObjects("db")).rejects.toThrow("listing key");
  });
});


describe("pinned backup storage operations", () => {
  it("keeps a logical operation in one bucket and refreshes the next operation", async () => {
    mockSend.mockReset();
    Object.assign(process.env, { BACKUP_R2_ACCOUNT_ID: "acct", BACKUP_R2_ACCESS_KEY_ID: "key", BACKUP_R2_SECRET_ACCESS_KEY: "secret", BACKUP_R2_BUCKET_NAME: "original", BACKUP_R2_PREFIX: "clients/alpha.example/backups" });
    const storage = await import("./backup-storage.service");
    const operation = await storage.beginBackupStorageOperation();
    expect(operation).not.toBeNull();
    expect(JSON.stringify(operation)).not.toContain("secret");
    process.env.BACKUP_R2_BUCKET_NAME = "replacement";
    mockSend.mockResolvedValue({ IsTruncated: false, Contents: [], Body: Buffer.from("archive") });
    await storage.uploadBackupObject("db/new.json.gz", Buffer.from("archive"), "application/json", undefined, operation!);
    await storage.listBackupObjects("db", 100, operation!);
    await storage.downloadBackupObject("clients/alpha.example/backups/db/new.json.gz", operation!);
    await storage.deleteBackupObject("clients/alpha.example/backups/db/old.json.gz", operation!);
    expect(mockSend.mock.calls.every(([command]) => command.Bucket === "original")).toBe(true);
    const next = await storage.beginBackupStorageOperation();
    expect(next?.bucketName).toBe("replacement");
    await storage.listBackupObjects("db", 100, next!);
    expect(mockSend.mock.lastCall?.[0].Bucket).toBe("replacement");
    process.env.BACKUP_S3_BUCKET = "incomplete";
    try {
      expect(await storage.beginBackupStorageOperation()).toBeNull();
    } finally {
      delete process.env.BACKUP_S3_BUCKET;
    }
  });
});
