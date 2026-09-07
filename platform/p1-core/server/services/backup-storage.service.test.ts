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
  logger: { backup: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } },
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
