import { beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { STATIC_BLOG_SOURCE_SLUGS } from "@shared/schema/blog-publications";
import { stageReviewedBlogMedia, type ReviewedBlogMediaFile } from "./blog-media-staging.service";
import type { LegacyUploadStorage, MigrationObject } from "./legacy-upload-storage";
let files: ReviewedBlogMediaFile[];
beforeAll(async () => {
  files = [];
  for (const [index, sourceSlug] of STATIC_BLOG_SOURCE_SLUGS.entries()) {
    for (const width of [1408, 480, 768, 1280]) {
      const original = width === 1408,
        height = Math.round((768 * width) / 1408);
      const image = sharp({
        create: { width, height, channels: 3, background: { r: index * 43, g: 110, b: 190 } },
      });
      const data = await (original ? image.png() : image.webp({ quality: 78 })).toBuffer();
      files.push({
        sourceSlug,
        role: original ? "original" : "variant",
        data,
        sha256: createHash("sha256").update(data).digest("hex"),
        bytes: data.length,
        mime: original ? "image/png" : "image/webp",
        width,
        height,
        quality: original ? null : 78,
      });
    }
  }
});
function fixture() {
  const objects = new Map<string, MigrationObject>();
  let writes = 0;
  const storage: LegacyUploadStorage = {
    bucketName: "test-only",
    async createOnly(key, object) {
      writes++;
      if (objects.has(key)) return "already-exists";
      objects.set(key, { ...object, body: Buffer.from(object.body) });
      return "created";
    },
    async read(key) {
      return objects.get(key) || null;
    },
  };
  return { objects, storage, writes: () => writes };
}
describe("reviewed Blog media staging", () => {
  it("preserves bytes without re-encoding and supports exact replay", async () => {
    const f = fixture();
    const first = await stageReviewedBlogMedia(f.storage, files);
    expect(first).toHaveLength(20);
    expect(first.every((row) => !("data" in row))).toBe(true);
    for (const row of first) {
      expect(row.url).toBe(`/r2/${row.r2Key}`);
      expect(f.objects.get(row.r2Key)?.body).toEqual(
        files.find((v) => v.sha256 === row.sha256)?.data,
      );
    }
    expect(await stageReviewedBlogMedia(f.storage, files)).toEqual(first);
    expect(f.objects.size).toBe(20);
  });
  it("validates the final file before any write", async () => {
    const f = fixture();
    const changed = files.map((v) => ({ ...v }));
    changed[19].sha256 = "0".repeat(64);
    await expect(stageReviewedBlogMedia(f.storage, changed)).rejects.toThrow("hash mismatch");
    await expect(stageReviewedBlogMedia(f.storage, files.slice(0, 19))).rejects.toThrow("twenty");
    expect(f.writes()).toBe(0);
  });
  it("rejects duplicate identities and forged metadata before writing", async () => {
    for (const patch of [
      { sourceSlug: "unreviewed" },
      { width: 481 },
      { mime: "image/jpeg" },
      { bytes: 1 },
      { quality: 101 },
    ]) {
      const f = fixture();
      await expect(
        stageReviewedBlogMedia(
          f.storage,
          files.map((v, i) => (i === 19 ? ({ ...v, ...patch } as ReviewedBlogMediaFile) : v)),
        ),
      ).rejects.toThrow();
      expect(f.writes()).toBe(0);
    }
    const f = fixture();
    await expect(
      stageReviewedBlogMedia(f.storage, [...files.slice(0, 19), files[0]]),
    ).rejects.toThrow("Duplicate");
    expect(f.writes()).toBe(0);
  });
  it("rejects truncated images with matching hashes before writing", async () => {
    const f = fixture();
    const truncated = Buffer.from(files[0].data.subarray(0, 100));
    expect((await sharp(truncated).metadata()).width).toBe(1408);
    const changed = files.map((v, i) =>
      i === 0
        ? {
            ...v,
            data: truncated,
            bytes: truncated.length,
            sha256: createHash("sha256").update(truncated).digest("hex"),
          }
        : v,
    );
    await expect(stageReviewedBlogMedia(f.storage, changed)).rejects.toThrow();
    expect(f.writes()).toBe(0);
  });
  it("never overwrites conflicting existing bytes", async () => {
    const f = fixture();
    const key = `cms/blog-static/${files[0].sha256}.png`;
    f.objects.set(key, { body: Buffer.from("conflict"), contentType: "image/png" });
    await expect(stageReviewedBlogMedia(f.storage, files)).rejects.toThrow("readback");
    expect(f.objects.get(key)?.body.toString()).toBe("conflict");
    expect(f.writes()).toBe(1);
  });
  it("rejects missing or wrong-MIME readback", async () => {
    for (const missing of [true, false]) {
      const f = fixture();
      f.storage.read = async (key) =>
        missing ? null : { ...f.objects.get(key)!, contentType: "text/plain" };
      await expect(stageReviewedBlogMedia(f.storage, files)).rejects.toThrow("readback");
      expect(f.objects.size).toBe(1);
    }
  });
  it("retains partial objects on interruption and resumes safely", async () => {
    const f = fixture();
    const create = f.storage.createOnly;
    f.storage.createOnly = async (key, object) => {
      if (f.objects.size === 7) throw Error("interrupted");
      return create(key, object);
    };
    await expect(stageReviewedBlogMedia(f.storage, files)).rejects.toThrow("interrupted");
    expect(f.objects.size).toBe(7);
    f.storage.createOnly = create;
    expect(await stageReviewedBlogMedia(f.storage, files)).toHaveLength(20);
  });
  it("owns source buffers across asynchronous storage callbacks", async () => {
    const f = fixture();
    const create = f.storage.createOnly;
    const copies = files.map((file) => ({ ...file, data: Buffer.from(file.data) }));
    f.storage.createOnly = async (key, object) => {
      for (const file of copies) {
        file.data.fill(0);
        file.width = 1;
      }
      return create(key, object);
    };
    expect(await stageReviewedBlogMedia(f.storage, copies)).toHaveLength(20);
  });
});
