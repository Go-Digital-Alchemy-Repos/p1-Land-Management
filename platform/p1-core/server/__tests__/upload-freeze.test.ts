import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
const state = vi.hoisted(() => ({
  configured: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  deleteMedia: vi.fn(),
  user: vi.fn(),
  optimize: vi.fn(),
}));
vi.mock("../storage", () => ({
  storage: {
    cmsMedia: {
      createMedia: state.create,
      getMedia: state.get,
      getAllMedia: state.list,
      updateFile: state.update,
      deleteMedia: state.deleteMedia,
    },
    users: { updateUser: state.user },
  },
}));
vi.mock("../services/r2.service", () => ({
  isConfigured: state.configured,
  uploadFile: state.upload,
  deleteFile: state.remove,
  normalizePublicUrl: async (url: string) => url,
}));
vi.mock("../services/image-optimizer", () => ({
  isImageMime: () => true,
  optimizeImage: state.optimize,
  CMS_OPTIONS: {},
  AVATAR_OPTIONS: {},
  ATTACHMENT_OPTIONS: {},
}));
vi.mock("../services/email.service", () => ({ sendEmail: vi.fn() }));
vi.mock("../services/cms-media-usage.service", () => ({ buildCmsMediaLibraryAssets: vi.fn() }));
vi.mock("../middleware/auth", () => ({
  requireAdminPermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  authenticateToken: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("multer", () => ({
  default: Object.assign(
    () => ({ single: () => (_req: unknown, _res: unknown, next: () => void) => next() }),
    { memoryStorage: () => ({}) },
  ),
}));
vi.mock("../storage/index", async () => await import("../storage"));
vi.mock("../db", () => ({ db: {} }));
import fs from "node:fs";
import { createCmsMediaAssetFromUpload } from "../services/cms-media-upload.service";
import { storeCareerResume } from "../services/careers.service";
import uploadRoutes from "../routes/upload.routes";
import mediaRoutes from "../routes/admin/cms-media.routes";
import { errorHandler } from "../middleware/error-handler";
const file = {
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  originalname: "test.png",
  mimetype: "image/png",
  size: 9,
} as Express.Multer.File;
let server: Server;
let base: string;
describe("upload mutation freeze", () => {
  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.file = file;
      req.body = {};
      req.user = { id: "synthetic", role: "admin" } as typeof req.user;
      next();
    });
    app.use("/upload", uploadRoutes);
    app.use("/cms", mediaRoutes);
    app.use(errorHandler);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("UPLOAD_MUTATIONS_FROZEN", "true");
    state.list.mockResolvedValue([]);
    state.configured.mockResolvedValue(true);
    state.upload.mockResolvedValue("/r2/synthetic");
    state.create.mockResolvedValue({ id: "media", url: "/r2/synthetic" });
    state.optimize.mockResolvedValue({
      buffer: file.buffer,
      mimeType: "image/png",
      extension: ".png",
      optimizedSize: 9,
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  it("rejects CMS/branding/avatar service upload and resume before remote/local/database work", async () => {
    const write = vi.spyOn(fs, "writeFileSync");
    await expect(
      createCmsMediaAssetFromUpload({
        buffer: file.buffer,
        originalName: "test.png",
        mimeType: "image/png",
        fileSize: 9,
      }),
    ).rejects.toMatchObject({ statusCode: 503 });
    await expect(storeCareerResume(file)).rejects.toMatchObject({ statusCode: 503 });
    expect(write).not.toHaveBeenCalled();
    expect(state.configured).not.toHaveBeenCalled();
    expect(state.upload).not.toHaveBeenCalled();
    expect(state.create).not.toHaveBeenCalled();
    expect(state.list).not.toHaveBeenCalled();
  });
  it.each([
    ["POST", "/upload/avatar"],
    ["POST", "/upload/attachment"],
    ["POST", "/cms/media/synthetic/replace"],
    ["DELETE", "/cms/media/synthetic"],
  ])("mounted %s %s returns503 without file/DB effects", async (method, route) => {
    const write = vi.spyOn(fs, "writeFileSync");
    const unlink = vi.spyOn(fs, "unlinkSync");
    const response = await fetch(base + route, { method });
    expect(response.status).toBe(503);
    expect(write).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
    for (const effect of [
      state.get,
      state.list,
      state.create,
      state.update,
      state.deleteMedia,
      state.user,
      state.upload,
      state.remove,
    ])
      expect(effect).not.toHaveBeenCalled();
  });
  it("keeps normal CMS and resume uploads unchanged when flag is absent", async () => {
    delete process.env.UPLOAD_MUTATIONS_FROZEN;
    expect(
      (
        await createCmsMediaAssetFromUpload({
          buffer: file.buffer,
          originalName: "test.png",
          mimeType: "image/png",
          fileSize: 9,
        })
      ).url,
    ).toBe("/r2/synthetic");
    expect((await storeCareerResume(file)).storageKey).toMatch(/^r2:career-resumes\//);
    expect(state.upload).toHaveBeenCalledTimes(2);
    expect(state.create).toHaveBeenCalledOnce();
  });
});
