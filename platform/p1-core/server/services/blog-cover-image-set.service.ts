import { isDeepStrictEqual } from "node:util";
import { eq, inArray } from "drizzle-orm";
import { cmsMedia } from "@shared/schema";
import { blogStaticImportReceipts } from "@shared/schema/blog-publications";
import type { BlogEditorialSnapshot } from "@shared/schema/blog-publications";
import { validateBlogCoverImageSet, type BlogCoverImageSet } from "@shared/blog-cover-image-set";
import { CmsMutationError, type CmsTransaction } from "./cms-concurrency";
type Reader = Pick<CmsTransaction, "select">;
const reject = () => {
  throw new CmsMutationError(
    409,
    "BLOG_COVER_SET_UNTRUSTED",
    "This responsive cover is not backed by its verified immutable import receipt. Choose a single cover or reload the imported post.",
  );
};
/** Internal import-bound ledger check: receipt need not exist yet in this transaction. */
export async function assertBlogCoverSetLedger(
  snapshot: BlogEditorialSnapshot,
  ledger: unknown,
  reader: Reader,
) {
  const set = snapshot.coverImageSet;
  if (set == null) {
    if (ledger != null) reject();
    return;
  }
  if (!validateBlogCoverImageSet(set, snapshot.coverImageUrl) || !isDeepStrictEqual(set, ledger))
    reject();
  const assets = [set.original, ...set.variants];
  const rows = await reader
    .select({
      id: cmsMedia.id,
      url: cmsMedia.url,
      r2Key: cmsMedia.r2Key,
      mime: cmsMedia.mimeType,
      bytes: cmsMedia.fileSize,
    })
    .from(cmsMedia)
    .where(
      inArray(
        cmsMedia.id,
        assets.map((a) => a.mediaId),
      ),
    );
  for (const asset of assets) {
    const row = rows.find((row) => row.id === asset.mediaId);
    if (
      !row ||
      !row.r2Key ||
      asset.url !== `/r2/${row.r2Key}` ||
      row.mime !== asset.mime ||
      row.bytes !== asset.bytes
    )
      reject();
  }
}
export async function assertBlogCoverSetOwned(
  postId: string,
  snapshot: BlogEditorialSnapshot,
  reader: Reader,
) {
  if (snapshot.coverImageSet == null) return;
  const [receipt] = await reader
    .select({ manifest: blogStaticImportReceipts.sourceManifest })
    .from(blogStaticImportReceipts)
    .where(eq(blogStaticImportReceipts.postId, postId));
  if (!receipt) reject();
  await assertBlogCoverSetLedger(snapshot, receipt.manifest.coverImageSet, reader);
}
