import sanitizeHtml from "sanitize-html";
import { db } from "../db";
import { blogPostRevisions, blogStaticImportReceipts } from "@shared/schema/blog-publications";
import { lockBlogPublication } from "./blog-publication.service";
import { CmsMutationError } from "./cms-concurrency";
import type { CmsMediaAsset } from "@shared/schema";
/** Conservative match protects every restorable revision, including withdrawn posts. */
export function blogRevisionReferencesMedia(
  snapshot: unknown,
  asset: Pick<CmsMediaAsset, "url" | "r2Key"> & Partial<Pick<CmsMediaAsset, "id">>,
  resolvedUrl?: string | null,
) {
  if (asset.id && snapshot && typeof snapshot === "object") {
    const set = (snapshot as { coverImageSet?: unknown }).coverImageSet;
    if (set && typeof set === "object") {
      const entries = set as { original?: unknown; variants?: unknown };
      const images = [
        entries.original,
        ...(Array.isArray(entries.variants) ? entries.variants : []),
      ];
      if (
        images.some(
          (image) =>
            image &&
            typeof image === "object" &&
            (image as { mediaId?: unknown }).mediaId === asset.id,
        )
      )
        return true;
    }
  }
  function aliases(value: string): string[] {
    const values = new Set([value]);
    try {
      const url = new URL(value, "https://www.p1landmanagement.com");
      values.add(url.pathname);
    } catch {
      /* Preserve the original conservative match for malformed URLs. */
    }
    for (const entry of [...values]) {
      try {
        values.add(decodeURIComponent(entry));
      } catch {
        /* Invalid escape sequence. */
      }
    }
    return [...values].filter((entry) => entry.length > 1);
  }
  const needles = [asset.url, asset.r2Key ? `/r2/${asset.r2Key}` : "", resolvedUrl ?? ""]
    .filter(Boolean)
    .flatMap(aliases);
  const references: string[] = [JSON.stringify(snapshot).replaceAll("&amp;", "&")];
  function collect(value: unknown) {
    if (typeof value === "string") {
      references.push(...aliases(value));
      // sanitize-html uses the same decoded attribute parser as public Blog media
      // resolution. Raw JSON searching alone misses numeric/named HTML entities.
      sanitizeHtml(value, {
        allowedTags: ["img"],
        allowedAttributes: false,
        transformTags: {
          img: (tagName, attribs) => {
            if (attribs.src) references.push(...aliases(attribs.src));
            return { tagName, attribs };
          },
        },
      });
    } else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  }
  collect(snapshot);
  return needles.some((needle) => references.some((reference) => reference.includes(needle)));
}
/** The same lock as revision creation preserves already-stored immutable references.
 * It does not validate arbitrary new URLs after an asset has already been deleted.
 */
export async function protectBlogRevisionMedia<T>(
  asset: Pick<CmsMediaAsset, "url" | "r2Key"> & Partial<Pick<CmsMediaAsset, "id">>,
  resolvedUrl: string | null | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await lockBlogPublication(tx);
    const revisions = await tx
      .select({ snapshot: blogPostRevisions.snapshot })
      .from(blogPostRevisions);
    const receipts = await tx
      .select({ snapshot: blogStaticImportReceipts.sourceManifest })
      .from(blogStaticImportReceipts);
    if (
      [...revisions, ...receipts].some((row) =>
        blogRevisionReferencesMedia(row.snapshot, asset, resolvedUrl),
      )
    )
      throw new CmsMutationError(
        409,
        "BLOG_REVISION_MEDIA_REFERENCED",
        "This asset is retained by Blog revision history. Upload a new asset instead; replacing or deleting it would break published or restorable content.",
      );
    return operation();
  });
}
