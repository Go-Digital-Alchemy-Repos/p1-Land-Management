import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock("../storage", () => ({ storage: {} }));
vi.mock("../services/r2.service", () => ({ downloadFile: mocks.download }));
vi.mock("../services/cms-media-usage.service", () => ({ buildCmsMediaLibraryAssets: vi.fn() }));
vi.mock("../middleware/auth", () => ({ requireAdminPermission: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
import { createCmsMediaAssetFromUpload, isCompatibleMediaUpload, validateMediaUpload } from "./cms-media-upload.service";
import mediaRoutes from "../routes/admin/cms-media.routes";
import publicRoutes from "../routes/r2-public.routes";
import { errorHandler } from "../middleware/error-handler";
let server: Server | undefined;
afterEach(async () => {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
  vi.clearAllMocks();
});
async function serve() {
  const app = express();
  app.use("/cms", mediaRoutes);
  app.use("/r2", publicRoutes);
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server!.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing address");
  return `http://127.0.0.1:${address.port}`;
}
describe("media active-content boundary", () => {
  it.each(["text/html", "application/javascript", "image/svg+xml"])("rejects %s hidden behind .txt at HTTP and service boundaries", async (mimeType) => {
    const base = await serve();
    const payload = Buffer.from('<script src="/r2/cms/media/code.txt"></script>');
    const data = new FormData();
    data.set("file", new Blob([payload], { type: mimeType }), "payload.txt");
    expect((await fetch(`${base}/cms/upload`, { method: "POST", body: data })).status).toBe(400);
    await expect(createCmsMediaAssetFromUpload({ buffer: payload, originalName: "payload.txt", mimeType, fileSize: payload.length })).rejects.toMatchObject({ statusCode: 400 });
  });
  it("requires compatible extension/MIME and actual raster data", async () => {
    expect(isCompatibleMediaUpload("script.html", "text/plain")).toBe(false);
    expect(isCompatibleMediaUpload("report.pdf", "application/pdf")).toBe(true);
    expect(isCompatibleMediaUpload("notes.txt", "text/plain")).toBe(true);
    await expect(validateMediaUpload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), "fake.png", "image/png")).rejects.toMatchObject({ statusCode: 400 });
    const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "white" } }).png().toBuffer();
    await expect(validateMediaUpload(png, "photo.png", "image/png")).resolves.toBeUndefined();
    await expect(validateMediaUpload(png, "photo.gif", "image/gif")).rejects.toMatchObject({ statusCode: 400 });
  });
  it.each(["text/html", "application/javascript", "application/pdf", "text/plain", "image/svg+xml"])("forces legacy %s objects to download with nosniff", async (contentType) => {
    mocks.download.mockResolvedValue({ buffer: Buffer.from("test"), contentType });
    const base = await serve();
    const response = await fetch(`${base}/r2/cms/media/payload.txt`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe("attachment");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
  });
  it("keeps raster images inline", async () => {
    mocks.download.mockResolvedValue({ buffer: Buffer.from("image"), contentType: "image/webp" });
    const response = await fetch(`${await serve()}/r2/cms/media/image.webp`);
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
