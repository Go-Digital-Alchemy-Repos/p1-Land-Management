/** Bounded static-article image sets. Hash claims require server receipt verification. */
export type ReviewedBlogImage = {
  mediaId: string;
  url: string;
  sha256: string;
  bytes: number;
  mime: "image/png" | "image/webp";
  width: number;
  height: number;
  quality: number | null;
};
export type BlogCoverImageSet = {
  schemaVersion: 1;
  sourceFingerprint: string;
  mediaReviewSha256: string;
  original: ReviewedBlogImage;
  defaultMediaId: string;
  variants: ReviewedBlogImage[];
};
export type PublicBlogResponsiveCover = {
  schemaVersion: 1;
  src: string;
  width: number;
  height: number;
  variants: Array<{ src: string; width: number; height: number }>;
};
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, k: string[]) =>
  Object.keys(v).sort().join() === [...k].sort().join();
const hash = (v: unknown) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const id = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(v);
export const isBlogCoverImageUrl = (v: unknown): v is string =>
  typeof v === "string" &&
  v.length <= 2048 &&
  /^\/r2\/cms\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/[A-Za-z0-9_.-]+\.(?:png|webp)$/.test(v) &&
  !v.includes("..");
const widths = [480, 768, 1280];
function image(v: unknown, original: boolean): v is ReviewedBlogImage {
  if (
    !record(v) ||
    !keys(v, ["mediaId", "url", "sha256", "bytes", "mime", "width", "height", "quality"]) ||
    !id(v.mediaId) ||
    !isBlogCoverImageUrl(v.url) ||
    !hash(v.sha256) ||
    !Number.isSafeInteger(v.bytes) ||
    (v.bytes as number) <= 0 ||
    (v.bytes as number) > 20 * 1024 * 1024
  )
    return false;
  return original
    ? v.mime === "image/png" &&
        v.url.endsWith(".png") &&
        v.width === 1408 &&
        v.height === 768 &&
        v.quality === null
    : v.mime === "image/webp" &&
        v.url.endsWith(".webp") &&
        widths.includes(v.width as number) &&
        v.height === Math.round((768 * (v.width as number)) / 1408) &&
        Number.isInteger(v.quality) &&
        (v.quality as number) >= 1 &&
        (v.quality as number) <= 100;
}
export function validateBlogCoverImageSet(
  value: unknown,
  coverImageUrl: string | null,
): value is BlogCoverImageSet {
  if (
    !record(value) ||
    !keys(value, [
      "schemaVersion",
      "sourceFingerprint",
      "mediaReviewSha256",
      "original",
      "defaultMediaId",
      "variants",
    ]) ||
    value.schemaVersion !== 1 ||
    !hash(value.sourceFingerprint) ||
    !hash(value.mediaReviewSha256) ||
    !image(value.original, true) ||
    !Array.isArray(value.variants) ||
    value.variants.length !== 3 ||
    !value.variants.every((v) => image(v, false))
  )
    return false;
  const all = [value.original, ...value.variants];
  return (
    new Set(all.map((v) => v.mediaId)).size === 4 &&
    new Set(all.map((v) => v.url)).size === 4 &&
    value.variants.every((v, i) => v.width === widths[i]) &&
    value.defaultMediaId === value.variants[2].mediaId &&
    coverImageUrl === value.variants[2].url
  );
}
export function validateBlogResponsiveCover(
  value: unknown,
  coverImageUrl: string | null,
): value is PublicBlogResponsiveCover {
  if (
    !record(value) ||
    !keys(value, ["schemaVersion", "src", "width", "height", "variants"]) ||
    value.schemaVersion !== 1 ||
    !isBlogCoverImageUrl(value.src) ||
    value.src !== coverImageUrl ||
    value.width !== 1280 ||
    value.height !== 698 ||
    !Array.isArray(value.variants) ||
    value.variants.length !== 3
  )
    return false;
  return (
    value.variants.every(
      (v, i) =>
        record(v) &&
        keys(v, ["src", "width", "height"]) &&
        isBlogCoverImageUrl(v.src) &&
        v.src.endsWith(".webp") &&
        v.width === widths[i] &&
        v.height === Math.round((768 * widths[i]) / 1408),
    ) &&
    new Set(value.variants.map((v) => v.src)).size === 3 &&
    value.src === value.variants[2].src
  );
}
export function publicBlogResponsiveCover(set: BlogCoverImageSet): PublicBlogResponsiveCover {
  return {
    schemaVersion: 1,
    src: set.variants[2].url,
    width: set.variants[2].width,
    height: set.variants[2].height,
    variants: set.variants.map((v) => ({ src: v.url, width: v.width, height: v.height })),
  };
}
