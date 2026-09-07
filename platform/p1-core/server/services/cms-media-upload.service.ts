import { assertUploadMutationsAllowed } from "./upload-mutation-policy";
import fs from "fs";
import sharp from "sharp";
import path from "path";
import { storage } from "../storage";
import * as r2Service from "./r2.service";
import { CMS_OPTIONS, isImageMime, optimizeImage, type OptimizedImage } from "./image-optimizer";
import type { CmsMediaAsset } from "@shared/schema";
import { AppError } from "../middleware/error-handler";

const MEDIA_EXTENSIONS_BY_MIME: Record<string, string[]> = {
  "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"], "image/gif": [".gif"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"], "application/vnd.ms-word": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/csv": [".csv"], "text/plain": [".txt"],
  "application/rtf": [".rtf"], "text/rtf": [".rtf"],
  "application/vnd.oasis.opendocument.text": [".odt"],
  "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
  "application/vnd.oasis.opendocument.presentation": [".odp"],
};

export function isCompatibleMediaUpload(filename: string, mimeType: string): boolean {
  return MEDIA_EXTENSIONS_BY_MIME[mimeType]?.includes(path.extname(filename).toLowerCase()) ?? false;
}

export async function validateMediaUpload(buffer: Buffer, filename: string, mimeType: string): Promise<void> {
  if (!isCompatibleMediaUpload(filename, mimeType)) throw new AppError("File extension and media type are not supported", 400);
  if (mimeType.startsWith("image/")) {
    try {
      const metadata = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata();
      const expectedFormat = mimeType.slice("image/".length);
      if (metadata.format !== expectedFormat || !metadata.width || !metadata.height) throw new Error("Unexpected image format");
    } catch {
      throw new AppError("Upload must contain a valid PNG, JPEG, WebP, or GIF image", 400);
    }
  }
}

type MediaUploadOptions = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string | null;
  directory?: string;
  title?: string | null;
  alt?: string | null;
  optimize?: false | Parameters<typeof optimizeImage>[2];
};

const LOCAL_CMS_ROOT = path.resolve(process.cwd(), "uploads", "cms");

function ensureParentDir(filePath: string) {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function stripExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, "");
}

function normalizeDirectory(directory: string | undefined) {
  const cleaned = (directory || "media").replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "");
  return cleaned || "media";
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildUniqueDisplayName(
  baseName: string,
  extension: string,
  existingNames: Iterable<string>,
) {
  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  const existing = new Set(Array.from(existingNames, (name) => name.toLowerCase()));

  let suffix = 0;
  let candidate = `${baseName}${normalizedExtension}`;
  while (existing.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${baseName}${suffix}${normalizedExtension}`;
  }

  return candidate;
}

export async function createCmsMediaAssetFromUpload({
  buffer,
  originalName,
  mimeType,
  fileSize,
  uploadedBy,
  directory,
  title,
  alt,
  optimize = CMS_OPTIONS,
}: MediaUploadOptions): Promise<CmsMediaAsset> {
  assertUploadMutationsAllowed();
  await validateMediaUpload(buffer, originalName, mimeType);
  const safeName = safeFilename(originalName);
  const baseName = stripExtension(safeName) || "media";
  const originalExtension = path.extname(safeName) || ".bin";
  const optimized: OptimizedImage | null =
    optimize !== false && isImageMime(mimeType)
      ? await optimizeImage(buffer, mimeType, optimize)
      : null;
  const fileBuffer = optimized?.buffer ?? buffer;
  const fileMimeType = optimized?.mimeType ?? mimeType;
  const fileExtension = optimized?.extension ?? originalExtension;
  const storedFileSize = optimized?.optimizedSize ?? fileSize;
  const mediaDirectory = normalizeDirectory(directory);

  const existingAssets = await storage.cmsMedia.getAllMedia();
  const displayName = buildUniqueDisplayName(
    baseName,
    fileExtension,
    existingAssets.map((asset) => asset.originalName),
  );
  const filename = `${Date.now()}-${stripExtension(displayName)}${fileExtension}`;
  const r2Key = `cms/${mediaDirectory}/${filename}`;

  const r2Configured = await r2Service.isConfigured();
  let publicUrl: string | null = null;

  if (r2Configured) {
    publicUrl = await r2Service.uploadFile(r2Key, fileBuffer, fileMimeType);
  }

  if (!publicUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Durable upload storage is unavailable", 503);
    }
    const localPath = path.join(LOCAL_CMS_ROOT, mediaDirectory, filename);
    ensureParentDir(localPath);
    fs.writeFileSync(localPath, fileBuffer);
    publicUrl = `/uploads/cms/${mediaDirectory}/${filename}`;
  }

  return storage.cmsMedia.createMedia({
    filename,
    originalName: displayName,
    title: title ?? stripExtension(displayName),
    url: publicUrl,
    mimeType: fileMimeType,
    fileSize: storedFileSize,
    r2Key: publicUrl.startsWith("/uploads/") ? null : r2Key,
    alt: alt ?? "",
    uploadedBy: uploadedBy ?? null,
  });
}
