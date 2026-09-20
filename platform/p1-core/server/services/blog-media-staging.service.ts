import { createHash } from "node:crypto";
import sharp from "sharp";
import { STATIC_BLOG_SOURCE_SLUGS } from "@shared/schema/blog-publications";
import type { LegacyUploadStorage } from "./legacy-upload-storage";

export type ReviewedBlogMediaFile = {
  sourceSlug: string;
  role: "original" | "variant";
  sha256: string;
  bytes: number;
  mime: "image/png" | "image/webp";
  width: number;
  height: number;
  quality: number | null;
  data: Buffer;
};
export type StagedBlogMediaFile = Omit<ReviewedBlogMediaFile, "data"> & {
  r2Key: string;
  url: string;
};
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const maxFileBytes = 10 * 1024 * 1024;

/** Internal staging primitive, not an import endpoint. The caller must first
 * approve the source/capture review and use an explicitly selected storage boundary.
 * Validates every source before the first write. Objects are create-only, and every
 * result (including replay) is read back. No automatic cleanup: after an uncertain
 * result, retry the same reviewed files; never overwrite or delete staged objects.
 * A successful result proves object bytes, not database registration/publication.
 */
export async function stageReviewedBlogMedia(
  storage: LegacyUploadStorage,
  input: readonly ReviewedBlogMediaFile[],
): Promise<StagedBlogMediaFile[]> {
  if (!Array.isArray(input) || input.length !== 20)
    throw new Error("Exactly twenty reviewed Blog media files are required");
  let total = 0;
  const identities = new Set<string>();
  const hashes = new Set<string>();
  const prepared: Array<{ record: StagedBlogMediaFile; data: Buffer }> = [];
  for (const raw of input) {
    const file = { ...raw };
    if (
      !file ||
      !STATIC_BLOG_SOURCE_SLUGS.some((slug) => slug === file.sourceSlug) ||
      !Buffer.isBuffer(file.data) ||
      file.data.length < 1 ||
      file.data.length > maxFileBytes ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes !== file.data.length ||
      !/^[a-f0-9]{64}$/.test(file.sha256)
    )
      throw new Error("Invalid reviewed Blog media identity or byte bounds");
    const original = file.role === "original";
    if (
      !(original || file.role === "variant") ||
      file.mime !== (original ? "image/png" : "image/webp") ||
      (original
        ? file.width !== 1408 || file.height !== 768 || file.quality !== null
        : ![480, 768, 1280].includes(file.width) ||
          file.height !== Math.round((768 * file.width) / 1408) ||
          !Number.isInteger(file.quality) ||
          file.quality! < 1 ||
          file.quality! > 100)
    )
      throw new Error("Unsupported reviewed Blog media dimensions or format");
    total += file.bytes;
    if (total > 50 * 1024 * 1024) throw new Error("Reviewed Blog media exceeds total byte limit");
    const identity = `${file.sourceSlug}:${file.role}:${file.width}`;
    if (identities.has(identity) || hashes.has(file.sha256))
      throw new Error("Duplicate reviewed Blog media identity");
    identities.add(identity);
    hashes.add(file.sha256);
    // Own the bytes across asynchronous reads/writes; callers may mutate their buffers.
    const data = Buffer.from(file.data);
    if (sha(data) !== file.sha256) throw new Error("Reviewed Blog media hash mismatch");
    const metadata = await sharp(data, { limitInputPixels: 40_000_000 }).metadata();
    if (
      metadata.format !== (original ? "png" : "webp") ||
      metadata.width !== file.width ||
      metadata.height !== file.height ||
      metadata.pages
    )
      throw new Error("Reviewed Blog media content does not match its declared format");
    // Header metadata alone can accept truncated files. Decode the bounded image
    // fully, but upload the original reviewed bytes unchanged.
    await sharp(data, { limitInputPixels: 40_000_000 }).raw().toBuffer();
    const r2Key = `cms/blog-static/${file.sha256}.${original ? "png" : "webp"}`;
    prepared.push({
      data,
      record: {
        sourceSlug: file.sourceSlug,
        role: file.role,
        sha256: file.sha256,
        bytes: file.bytes,
        mime: file.mime,
        width: file.width,
        height: file.height,
        quality: file.quality,
        r2Key,
        url: `/r2/${r2Key}`,
      },
    });
  }
  for (const slug of STATIC_BLOG_SOURCE_SLUGS) {
    for (const [role, width] of [
      ["original", 1408],
      ["variant", 480],
      ["variant", 768],
      ["variant", 1280],
    ] as const) {
      if (!identities.has(`${slug}:${role}:${width}`))
        throw new Error("Incomplete reviewed Blog media set");
    }
  }
  for (const { data, record } of prepared) {
    const result = await storage.createOnly(record.r2Key, {
      body: data,
      contentType: record.mime,
      cacheControl: "public, max-age=31536000, immutable",
    });
    if (result !== "created" && result !== "already-exists")
      throw new Error("Unexpected Blog media staging result");
    const stored = await storage.read(record.r2Key);
    if (
      !stored ||
      stored.contentType !== record.mime ||
      stored.body.length !== record.bytes ||
      sha(stored.body) !== record.sha256
    )
      throw new Error("Staged Blog media failed verified readback; objects retained for recovery");
  }
  return prepared.map(({ record }) => record);
}
