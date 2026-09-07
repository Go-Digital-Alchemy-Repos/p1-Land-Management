import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  upload: vi.fn(),
  write: vi.fn(),
  createMedia: vi.fn(),
}));

vi.mock("fs", () => ({
  default: { existsSync: () => true, mkdirSync: vi.fn(), writeFileSync: mocks.write },
}));
vi.mock("../storage", () => ({
  storage: { cmsMedia: { getAllMedia: async () => [], createMedia: mocks.createMedia } },
}));
vi.mock("../storage/index", () => ({ storage: { users: { updateUser: vi.fn() } } }));
vi.mock("../services/r2.service", () => ({
  isConfigured: mocks.configured,
  uploadFile: mocks.upload,
}));
vi.mock("../middleware/auth", () => ({
  authenticateToken: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: "test-admin", role: "admin" };
    next();
  },
}));

describe("durable production uploads", () => {
  let server: Server | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    mocks.configured.mockResolvedValue(false);
    mocks.upload.mockResolvedValue(null);
    mocks.createMedia.mockImplementation(async (asset) => ({ id: "asset-1", ...asset }));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
      server = undefined;
    }
  });

  async function uploadAttachment() {
    const { default: router } = await import("../routes/upload.routes");
    const { errorHandler } = await import("../middleware/error-handler");
    const app = express();
    app.use(router);
    app.use(errorHandler);
    server = app.listen(0);
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test listener");
    const form = new FormData();
    form.set("file", new Blob(["sample"], { type: "text/plain" }), "sample.txt");
    return fetch(`http://127.0.0.1:${address.port}/attachment`, { method: "POST", body: form });
  }

  async function uploadMedia() {
    const { createCmsMediaAssetFromUpload } = await import("../services/cms-media-upload.service");
    return createCmsMediaAssetFromUpload({
      buffer: Buffer.from("sample"),
      originalName: "sample.txt",
      mimeType: "text/plain",
      fileSize: 6,
      optimize: false,
    });
  }

  it.each([false, true])(
    "rejects attachment disk fallback when R2 configured=%s",
    async (configured) => {
      mocks.configured.mockResolvedValue(configured);
      expect((await uploadAttachment()).status).toBe(503);
      expect(mocks.write).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])("rejects CMS disk fallback when R2 configured=%s", async (configured) => {
    mocks.configured.mockResolvedValue(configured);
    await expect(uploadMedia()).rejects.toMatchObject({ statusCode: 503 });
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.createMedia).not.toHaveBeenCalled();
  });

  it("returns durable attachment URLs when storage succeeds", async () => {
    mocks.configured.mockResolvedValue(true);
    mocks.upload.mockResolvedValue("https://media.example.test/attachment.txt");
    const response = await uploadAttachment();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      url: "https://media.example.test/attachment.txt",
    });
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("creates CMS metadata only after durable storage succeeds", async () => {
    mocks.configured.mockResolvedValue(true);
    mocks.upload.mockResolvedValue("https://media.example.test/media.txt");
    await expect(uploadMedia()).resolves.toMatchObject({
      url: "https://media.example.test/media.txt",
    });
    expect(mocks.createMedia).toHaveBeenCalledOnce();
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("retains development-only local attachment fallback", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await uploadAttachment();
    expect(response.status).toBe(200);
    expect((await response.json()).url).toMatch(/^\/uploads\/attachments\//);
    expect(mocks.write).toHaveBeenCalledOnce();
  });

  it("retains development-only local CMS fallback without an R2 key", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.configured.mockResolvedValue(true);
    await expect(uploadMedia()).resolves.toMatchObject({ r2Key: null });
    expect(mocks.write).toHaveBeenCalledOnce();
  });
});
