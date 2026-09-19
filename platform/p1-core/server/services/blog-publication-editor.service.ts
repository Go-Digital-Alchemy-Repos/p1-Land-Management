import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { blogPosts, editorLocks, type User } from "@shared/schema";
import {
  blogEditorialSchema,
  blogPublicationState as states,
  blogPostRevisions as revisions,
  blogPublicationSchedules as schedules,
  blogPublicationRoutes as routes,
  type BlogEditorialSnapshot,
} from "@shared/schema/blog-publications";
import { CmsMutationError, databaseNow, type CmsTransaction } from "./cms-concurrency";
import {
  initializeBlogInTransaction,
  legacyBlogEditorial,
  legacyBlogFingerprint,
  lockBlogPublication,
} from "./blog-publication.service";
import { blogLeaseInTransaction } from "./blog-publication-leases.service";
import { sanitizePublicRichHtml } from "../utils/sanitize-rich-html";
export async function publicationEnvelope(tx: Pick<CmsTransaction, "select">, id: string) {
  const [legacy] = await tx.select().from(blogPosts).where(eq(blogPosts.id, id));
  if (!legacy) throw new CmsMutationError(404, "BLOG_NOT_FOUND", "Post not found");
  const [state] = await tx.select().from(states).where(eq(states.postId, id));
  if (!state)
    return {
      ...legacy,
      publication: {
        requiresAdoption: true,
        version: null,
        legacyFingerprint: legacyBlogFingerprint(legacy),
        visibility: "legacy" as const,
        draftRevisionId: null,
        publishedRevisionId: null,
        lastPublishedRevisionId: null,
        publicationGeneration: 0,
        schedule: null,
      },
    };
  const [draft] = await tx.select().from(revisions).where(eq(revisions.id, state.draftRevisionId));
  const [job] = await tx
    .select()
    .from(schedules)
    .where(eq(schedules.postId, id))
    .orderBy(desc(schedules.createdVersion))
    .limit(1);
  return {
    ...blogEditorialSchema.parse(draft.snapshot),
    id,
    createdAt: legacy.createdAt,
    updatedAt: state.updatedAt,
    isPublished: state.visibility === "published",
    publishedAt: state.visibility === "published" ? state.firstPublishedAt : null,
    scheduledAt: job?.status === "pending" ? job.scheduledAt : null,
    publication: {
      requiresAdoption: false,
      version: state.version,
      legacyFingerprint: legacyBlogFingerprint(legacy),
      visibility: state.visibility as "unpublished" | "published" | "deleted",
      draftRevisionId: state.draftRevisionId,
      publishedRevisionId: state.publishedRevisionId,
      lastPublishedRevisionId: state.lastPublishedRevisionId,
      publicationGeneration: state.publicationGeneration,
      schedule: job
        ? {
            id: job.id,
            revisionId: job.revisionId,
            scheduledAt: job.scheduledAt,
            failureCode: job.failureCode,
            status: job.status as "pending" | "published" | "cancelled" | "failed",
          }
        : null,
    },
  };
}
export async function getBlogPublication(id: string) {
  return db.transaction(async (tx) => {
    await lockBlogPublication(tx);
    return publicationEnvelope(tx, id);
  });
}
export async function listBlogPublications() {
  return db.transaction(async (tx) => {
    await lockBlogPublication(tx);
    const posts = await tx
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt));
    const items = await Promise.all(posts.map((p) => publicationEnvelope(tx, p.id)));
    return items.filter((p) => p.publication.visibility !== "deleted");
  });
}
export async function createBlogPublication(
  data: BlogEditorialSnapshot,
  user: User,
  editorInstanceId: string,
) {
  const parsed = blogEditorialSchema.parse(data);
  return db.transaction(async (tx) => {
    await lockBlogPublication(tx);
    if ((await tx.select().from(routes).where(eq(routes.slug, parsed.slug))).length)
      throw new CmsMutationError(
        409,
        "BLOG_SLUG_OWNED",
        "This URL is owned by publication history.",
      );
    if (
      (await tx.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, parsed.slug)))
        .length
    )
      throw new CmsMutationError(
        409,
        "BLOG_SLUG_OWNED",
        "A post already uses this URL. Reload the list before creating another post.",
      );
    // Legacy identity is durable and kept unpublished; content is owned by revisions.
    const [post] = await tx
      .insert(blogPosts)
      .values({ ...parsed, isPublished: false, scheduledAt: null, publishedAt: null })
      .returning();
    await initializeBlogInTransaction(tx, post.id, user.id, {
      kind: "legacy-adoption",
      sourceReference: `created:${post.id}`,
      reason: "Explicit new publication draft",
    });
    const lease = await blogLeaseInTransaction(tx, "acquire", post.id, user, { editorInstanceId });
    return { ...(await publicationEnvelope(tx, post.id)), lease };
  });
}
export async function adoptBlogPublication(
  id: string,
  user: User,
  expectedLegacyFingerprint: string,
  editorInstanceId: string,
  reason: string,
) {
  if (!/^[a-f0-9]{64}$/.test(expectedLegacyFingerprint))
    throw new CmsMutationError(
      400,
      "BLOG_ADOPTION_PRECONDITION",
      "A valid legacy fingerprint is required.",
    );
  return db.transaction(async (tx) => {
    await lockBlogPublication(tx);
    const now = await databaseNow(tx);
    const [lock] = await tx
      .select()
      .from(editorLocks)
      .where(and(eq(editorLocks.resourceType, "blog_post"), eq(editorLocks.resourceId, id)))
      .for("update");
    if (
      lock &&
      lock.expiresAt > now &&
      (lock.lockedByUserId !== user.id || lock.editorInstanceId !== null)
    )
      throw new CmsMutationError(409, "BLOG_LEASE_LOST", "Another editor holds this post.");
    await initializeBlogInTransaction(
      tx,
      id,
      user.id,
      { kind: "legacy-adoption", sourceReference: `legacy:${id}`, reason },
      expectedLegacyFingerprint,
    );
    if (lock) await tx.delete(editorLocks).where(eq(editorLocks.id, lock.id));
    const lease = await blogLeaseInTransaction(tx, "acquire", id, user, { editorInstanceId });
    return { ...(await publicationEnvelope(tx, id)), lease };
  });
}
export async function blogRevisionSummaries(id: string) {
  await getBlogPublication(id);
  return db
    .select({
      id: revisions.id,
      postId: revisions.postId,
      version: revisions.version,
      action: revisions.action,
      actorId: revisions.actorId,
      createdAt: revisions.createdAt,
      sourceRevisionId: revisions.sourceRevisionId,
    })
    .from(revisions)
    .where(eq(revisions.postId, id))
    .orderBy(desc(revisions.version));
}
export function sanitizedBlogSnapshot(snapshot: BlogEditorialSnapshot): BlogEditorialSnapshot {
  const safeUrl = (value: string | null) => {
    if (!value) return value;
    if (/[\u0000-\u0020\u007f\\]/.test(value)) return null;
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
    try {
      const u = new URL(value);
      return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password ? value : null;
    } catch {
      return null;
    }
  };
  return {
    ...snapshot,
    content: sanitizePublicRichHtml(snapshot.content) ?? "",
    coverImageUrl: safeUrl(snapshot.coverImageUrl),
    ogImageUrl: safeUrl(snapshot.ogImageUrl),
    podcastUrl: safeUrl(snapshot.podcastUrl),
    externalUrl: safeUrl(snapshot.externalUrl),
  };
}
export async function previewBlogRevision(id: string, revisionId?: string) {
  return db.transaction(async (tx) => {
    await lockBlogPublication(tx);
    const envelope = await publicationEnvelope(tx, id);
    if (envelope.publication.requiresAdoption || envelope.publication.visibility === "deleted")
      throw new CmsMutationError(
        404,
        "BLOG_NOT_INITIALIZED",
        "Adopt the post before previewing revisions.",
      );
    const [revision] = await tx
      .select()
      .from(revisions)
      .where(
        and(
          eq(revisions.postId, id),
          eq(revisions.id, revisionId ?? envelope.publication.draftRevisionId!),
        ),
      );
    if (!revision) throw new CmsMutationError(404, "BLOG_REVISION_NOT_FOUND", "Revision not found");
    return {
      id,
      revisionId: revision.id,
      snapshot: sanitizedBlogSnapshot(blogEditorialSchema.parse(revision.snapshot)),
    };
  });
}
