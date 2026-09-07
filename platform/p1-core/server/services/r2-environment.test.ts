import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { send, client, settings } = vi.hoisted(() => {
  const send = vi.fn();
  return { send, client: vi.fn(function () { return { send }; }), settings: vi.fn() };
});
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: client,
  PutObjectCommand: class { constructor(public input: unknown) {} },
  GetObjectCommand: class { constructor(public input: unknown) {} },
  DeleteObjectCommand: class { constructor(public input: unknown) {} },
  HeadBucketCommand: class { constructor(public input: unknown) {} },
  ListObjectsV2Command: class { constructor(public input: unknown) {} },
}));
vi.mock("../utils/logger", () => ({ logger: { r2: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }, backup: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } } }));
vi.mock("../utils/retry", () => ({ retryOnce: (fn: () => unknown) => fn() }));
vi.mock("../storage/index", () => ({ storage: { settings: { getDecryptedCategory: settings } } }));
import { getBackupStorageInfo, uploadBackupObject, resetBackupStorageClient } from "./backup-storage.service";
import { downloadFile, getEnvironmentS3Config, resetClient, uploadFile, isConfigured } from "./r2.service";

beforeEach(() => {
  vi.clearAllMocks();
  resetClient();
  resetBackupStorageClient();
  for (const prefix of ["S3", "BACKUP_S3"]) for (const name of ["ENDPOINT", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET", "REGION", "FORCE_PATH_STYLE"]) vi.stubEnv(`${prefix}_${name}`, undefined);
  vi.stubEnv("UPLOAD_MUTATIONS_FROZEN", "false");
  vi.stubEnv("S3_ENDPOINT", "https://storage.example.test");
  vi.stubEnv("S3_ACCESS_KEY_ID", "test-key");
  vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret");
  vi.stubEnv("S3_BUCKET", "p1-dedicated-media");
});
afterEach(() => vi.unstubAllEnvs());

describe("P1 dedicated S3 storage", () => {
  it("uploads and reads within the P1 namespace using environment config without database access", async () => {
    send.mockResolvedValueOnce({});
    expect(await uploadFile("cms/test.webp", Buffer.from("test"), "image/webp")).toBe("/r2/cms/test.webp");
    expect(client).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "https://storage.example.test", region: "auto", forcePathStyle: true }));
    expect(send.mock.calls[0][0].input).toEqual(expect.objectContaining({ Bucket: "p1-dedicated-media", Key: "clients/p1landmanagement.com/uploads/cms/test.webp", ContentType: "image/webp" }));
    send.mockResolvedValueOnce({ Body: { transformToByteArray: async () => Buffer.from("test") }, ContentType: "image/webp" });
    expect(await downloadFile("cms/test.webp")).toEqual({ buffer: Buffer.from("test"), contentType: "image/webp" });
    expect(settings).not.toHaveBeenCalled();
  });
  it("fails closed for incomplete credentials and invalid endpoints", async () => {
    vi.stubEnv("S3_SECRET_ACCESS_KEY", undefined);
    expect(await isConfigured()).toBe(false);
    expect(settings).not.toHaveBeenCalled();
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret");
    vi.stubEnv("S3_ENDPOINT", "https://user:password@storage.example.test");
    expect(await isConfigured()).toBe(false);
  });
  it("rejects traversal keys before any SDK command", async () => {
    expect(await uploadFile("../backups/private", Buffer.from("test"), "text/plain")).toBeNull();
    expect(await downloadFile("folder/../../private")).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });
  it("writes backups separately in the same dedicated bucket", async () => {
    send.mockResolvedValue({});
    expect(await getBackupStorageInfo()).toEqual({ bucketName: "p1-dedicated-media", prefix: "clients/p1landmanagement.com/backups", source: "env" });
    expect(await uploadBackupObject("snapshot.tar.gz", Buffer.from("backup"), "application/gzip")).toEqual({ key: "clients/p1landmanagement.com/backups/snapshot.tar.gz" });
    expect(send.mock.calls[0][0].input).toEqual(expect.objectContaining({ Key: "clients/p1landmanagement.com/backups/snapshot.tar.gz" }));
    expect(settings).not.toHaveBeenCalled();
  });
  it("gives backups a separate fixed namespace and supports explicit dedicated backup config", () => {
    expect(getEnvironmentS3Config("S3", "backups")?.prefix).toBe("clients/p1landmanagement.com/backups");
    expect(getEnvironmentS3Config("BACKUP_S3", "backups")).toBeUndefined();
    vi.stubEnv("BACKUP_S3_ENDPOINT", "https://backups.example.test");
    expect(getEnvironmentS3Config("BACKUP_S3", "backups")).toBeNull();
  });
});
