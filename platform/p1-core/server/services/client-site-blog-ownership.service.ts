import { eq } from "drizzle-orm";
import { db } from "../db";
import { STATIC_BLOG_SLUGS } from "@shared/public-blog";
import { blogStaticImportReceipts } from "@shared/schema/blog-publications";
import type { CmsTransaction } from "./cms-concurrency";
import { lockBlogPublication } from "./blog-publication.service";
import { ClientSiteContentConflictError } from "./client-site-content-workflow";

type Identity = { stackId: string; routeId: string; componentKey: string };
export type OwnedBlog = { postId: string; sourceSlug: string };
export function staticBlogSource(identity: Identity): string | undefined {
  if (identity.stackId !== "p1-land-management") return;
  return STATIC_BLOG_SLUGS.find(
    (slug) =>
      identity.routeId === `blog-${slug}` && identity.componentKey === `blog-${slug}-content`,
  );
}
export async function getClientSiteBlogOwnership(
  identity: Identity,
  reader: Pick<CmsTransaction, "select"> = db,
): Promise<OwnedBlog | undefined> {
  const sourceSlug = staticBlogSource(identity);
  if (!sourceSlug) return;
  const [receipt] = await reader
    .select({
      postId: blogStaticImportReceipts.postId,
      sourceSlug: blogStaticImportReceipts.sourceSlug,
    })
    .from(blogStaticImportReceipts)
    .where(eq(blogStaticImportReceipts.sourceSlug, sourceSlug));
  return receipt;
}
/** Same global lock and order as import: ownership is checked before client rows. */
export async function assertClientSiteBlogWritable(tx: CmsTransaction, identity: Identity) {
  if (!staticBlogSource(identity)) return;
  await lockBlogPublication(tx);
  if (await getClientSiteBlogOwnership(identity, tx))
    throw new ClientSiteContentConflictError(
      "This article is managed in Blog. Archived Website fields cannot be saved, published or restored.",
    );
}
