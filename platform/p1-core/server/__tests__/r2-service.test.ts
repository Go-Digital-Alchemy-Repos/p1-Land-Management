import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSend = vi.fn();
const MockS3Client = vi.fn(() => ({ send: mockSend }));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: MockS3Client,
  PutObjectCommand: vi.fn((params: unknown) => ({ type: "PutObject", ...(params as object) })),
  DeleteObjectCommand: vi.fn((params: unknown) => ({
    type: "DeleteObject",
    ...(params as object),
  })),
  HeadBucketCommand: vi.fn((params: unknown) => ({ type: "HeadBucket", ...(params as object) })),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    r2: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    app: { warn: vi.fn() },
  },
}));

vi.mock("../utils/retry", () => ({
  retryOnce: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

const mockGetDecryptedCategory = vi.fn();
vi.mock("../storage/index", () => ({
  storage: {
    settings: {
      getDecryptedCategory: mockGetDecryptedCategory,
    },
  },
}));

describe("R2 service", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("freeze throws before configuration/SDK work instead of returning fallback sentinels", async () => {
    vi.stubEnv("UPLOAD_MUTATIONS_FROZEN", "true");
    const mod = await import("../services/r2.service");
    await expect(
      mod.uploadFile("test.png", Buffer.from("data"), "image/png"),
    ).rejects.toMatchObject({ statusCode: 503 });
    await expect(mod.deleteFile("test.png")).rejects.toMatchObject({ statusCode: 503 });
    expect(mockGetDecryptedCategory).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    MockS3Client.mockClear();
    delete process.env.CLIENT_STACK_ID;
    delete process.env.PUBLIC_SITE_ORIGIN;
    const mod = await import("../services/r2.service");
    mod.resetClient();
  });

  it("skips DB config fetch when client is already cached", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: "https://cdn.example.com",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    await mod.uploadFile("test.png", Buffer.from("data"), "image/png");
    expect(mockGetDecryptedCategory).toHaveBeenCalledTimes(1);

    await mod.uploadFile("test2.png", Buffer.from("data2"), "image/png");
    expect(mockGetDecryptedCategory).toHaveBeenCalledTimes(1);
  });

  it("re-fetches config after resetClient is called", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: "",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    await mod.uploadFile("a.png", Buffer.from("a"), "image/png");
    mod.resetClient();
    await mod.uploadFile("b.png", Buffer.from("b"), "image/png");

    expect(mockGetDecryptedCategory).toHaveBeenCalledTimes(2);
  });

  it("uses an app-served URL when no public URL is configured", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: "",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    const url = await mod.uploadFile("images/photo.jpg", Buffer.from("data"), "image/jpeg");
    expect(url).toBe("/r2/images/photo.jpg");
  });

  it("uses an app-served URL when the configured public URL is the private R2 API host", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: "https://acct.r2.cloudflarestorage.com/bucket",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    const url = await mod.uploadFile("images/photo.jpg", Buffer.from("data"), "image/jpeg");
    expect(url).toBe("/r2/images/photo.jpg");
  });

  it("returns null when R2 is not configured", async () => {
    mockGetDecryptedCategory.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    const result = await mod.uploadFile("test.png", Buffer.from("data"), "image/png");
    expect(result).toBeNull();
  });

  it("returns correct public URL on upload", async () => {
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "bucket",
      r2_public_url: "https://cdn.example.com/",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    const url = await mod.uploadFile("images/photo.jpg", Buffer.from("data"), "image/jpeg");
    expect(url).toBe("https://cdn.example.com/system-backups/uploads/images/photo.jpg");
  });

  it("stores uploads under the activated client domain namespace", async () => {
    process.env.CLIENT_STACK_ID = "better-farms-foundation";
    process.env.PUBLIC_SITE_ORIGIN = "https://www.better-farms.org";
    mockGetDecryptedCategory.mockResolvedValue({
      r2_account_id: "acct",
      r2_access_key_id: "key",
      r2_secret_access_key: "secret",
      r2_bucket_name: "core-platform-website-backups",
      r2_public_url: "",
    });
    mockSend.mockResolvedValue({});

    const mod = await import("../services/r2.service");
    const url = await mod.uploadFile("cms/media/photo.jpg", Buffer.from("data"), "image/jpeg");

    expect(url).toBe("/r2/cms/media/photo.jpg");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ Key: "clients/better-farms.org/uploads/cms/media/photo.jpg" }),
    );
  });
});
