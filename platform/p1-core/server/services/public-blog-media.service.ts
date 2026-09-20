import { assertBlogCoverSetOwned } from "./blog-cover-image-set.service";
import { inArray, or } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import { db } from "../db";
import { cmsMedia } from "@shared/schema";
import {
  canonicalIdentityImagePath,
  PUBLIC_IDENTITY_BUNDLED_IMAGES,
} from "@shared/public-website-identity";
import { sanitizePublicRichHtml } from "../utils/sanitize-rich-html";
import { isPublicR2Key } from "../utils/public-storage-policy";
import type { CmsTransaction } from "./cms-concurrency";
import { PublicBlogCapacityError, type PublishedBlogRow } from "./public-blog-projection.service";
const tags = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "hr",
  "h2",
  "h3",
  "h4",
  "a",
  "img",
];
function rewriteImages(html: string, rewrite: (url: string) => string) {
  return sanitizeHtml(sanitizePublicRichHtml(html) ?? "", {
    allowedTags: tags,
    allowedAttributes: false,
    transformTags: {
      img: (_tag, attrs) => ({
        tagName: "img",
        attribs: { ...attrs, src: rewrite(attrs.src || "") },
      }),
    },
  });
}
function localPath(raw: string) {
  try {
    const url = new URL(raw, "https://www.p1landmanagement.com");
    if (
      !["https://www.p1landmanagement.com", "https://p1landmanagement.com"].includes(url.origin) ||
      url.username ||
      url.password
    )
      return null;
    return canonicalIdentityImagePath(url.pathname);
  } catch {
    return null;
  }
}
/** Resolve only exact registered assets or their known canonical media aliases.
 * No network requests, configuration writes, or draft/revision mutation.
 * Call inside the publication transaction or a repeatable-read public transaction.
 */
export async function resolvePublicBlogMedia(
  rows: PublishedBlogRow[],
  reader: Pick<CmsTransaction, "select"> = db,
): Promise<PublishedBlogRow[]> {
  const urls = new Set<string>();
  for (const row of rows) {
    await assertBlogCoverSetOwned(row.id, row.snapshot, reader);
    if (row.snapshot.coverImageUrl) urls.add(row.snapshot.coverImageUrl);
    if (row.snapshot.ogImageUrl) urls.add(row.snapshot.ogImageUrl);
    rewriteImages(row.snapshot.content, (url) => {
      if (url) urls.add(url);
      return url;
    });
  }
  if (!urls.size) return rows;
  const aliases = new Set(urls),
    keys = new Set<string>();
  for (const raw of urls) {
    const local = localPath(raw);
    if (local) {
      aliases.add(local);
      aliases.add(`https://www.p1landmanagement.com${local}`);
      aliases.add(`https://p1landmanagement.com${local}`);
      if (local.startsWith("/r2/")) keys.add(local.slice(4));
    }
  }
  const assets = await reader
    .select({ url: cmsMedia.url, r2Key: cmsMedia.r2Key, mimeType: cmsMedia.mimeType })
    .from(cmsMedia)
    .where(
      or(
        inArray(cmsMedia.url, [...aliases]),
        keys.size ? inArray(cmsMedia.r2Key, [...keys]) : undefined,
      ),
    );
  function image(raw: string): string {
    const local = localPath(raw);
    if (local && PUBLIC_IDENTITY_BUNDLED_IMAGES.some((path) => path === local)) return local;
    const candidates = assets.filter(
      (asset) =>
        asset.url === raw ||
        (local &&
          (asset.url === local ||
            localPath(asset.url) === local ||
            (asset.r2Key && `/r2/${asset.r2Key}` === local))),
    );
    if (candidates.length !== 1)
      throw new PublicBlogCapacityError(
        "An article image is not a recognized public media asset. Select or upload an image from the media library before publishing.",
      );
    const asset = candidates[0];
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(asset.mimeType))
      throw new PublicBlogCapacityError("Public Blog images must be PNG, JPEG, WebP, or GIF.");
    const path = asset.r2Key
      ? canonicalIdentityImagePath(`/r2/${asset.r2Key}`)
      : canonicalIdentityImagePath(asset.url);
    if (!path || (asset.r2Key && !isPublicR2Key(asset.r2Key)))
      throw new PublicBlogCapacityError(
        "An article image belongs to private or unsupported storage. Choose a public media image before publishing.",
      );
    return path;
  }
  return rows.map((row) => ({
    ...row,
    snapshot: {
      ...row.snapshot,
      coverImageUrl: row.snapshot.coverImageUrl ? image(row.snapshot.coverImageUrl) : null,
      ogImageUrl: row.snapshot.ogImageUrl ? image(row.snapshot.ogImageUrl) : null,
      content: rewriteImages(row.snapshot.content, image),
    },
  }));
}
