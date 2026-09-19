import { createHash, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { blogPosts, editorLocks, type BlogPost } from "@shared/schema";
import {
  blogEditorialSchema,
  blogProvenanceSchema,
  blogPublicationState as states,
  blogPostRevisions as revisions,
  blogPublicationRoutes as routes,
  type BlogEditorialSnapshot,
  type BlogProvenance,
} from "@shared/schema/blog-publications";
import {
  CmsMutationError,
  databaseNow,
  pagePreconditionSchema,
  type CmsTransaction,
  type PagePreconditions,
} from "./cms-concurrency";
export const WEBSITE_OWNED_BLOG_SLUGS = new Set([
  "land-clearing-cost-per-acre-south-carolina",
  "how-to-manage-retention-pond-south-carolina",
  "best-grass-large-acreage-carolinas",
  "signs-property-drainage-problem",
  "preparing-land-agricultural-use-carolinas",
]);
export async function lockBlogPublication(tx: CmsTransaction) {
  await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended('blog-publication-writes', 0))`,
  );
}
function fingerprint(post: BlogPost) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        Object.fromEntries(Object.entries(post).sort(([a], [b]) => a.localeCompare(b))),
      ),
    )
    .digest("hex");
}
function editorial(post: BlogPost) {
  const {
    id: _id,
    isPublished: _published,
    scheduledAt: _schedule,
    publishedAt: _publishedAt,
    createdAt: _created,
    updatedAt: _updated,
    ...snapshot
  } = post;
  return blogEditorialSchema.parse(snapshot);
}
function fail(code: string, message: string): never {
  throw new CmsMutationError(409, code, message);
}
/** Explicit staging only: existing rows and their public flags are never changed. */
export async function initializeBlogPublication(
  postId: string,
  actorId: string,
  provenance: BlogProvenance,
) {
  const origin = blogProvenanceSchema.parse(provenance);
  if (!actorId.trim()) throw new Error("Actor required");
  return db.transaction(async (tx) => {
    await lockBlogPublication(tx);
    if ((await tx.select().from(states).where(eq(states.postId, postId))).length)
      fail("BLOG_ALREADY_INITIALIZED", "This post already has publication state.");
    const [legacy] = await tx
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, postId))
      .for("update");
    if (!legacy) throw new CmsMutationError(404, "BLOG_NOT_FOUND", "Post not found");
    const snapshot = editorial(legacy),
      id = randomUUID(),
      now = await databaseNow(tx);
    const [state] = await tx
      .insert(states)
      .values({
        postId,
        version: 1,
        draftRevisionId: id,
        legacyFingerprint: fingerprint(legacy),
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx
      .insert(revisions)
      .values({
        id,
        postId,
        version: 1,
        snapshot,
        action: "initialize",
        actorId,
        provenance: { ...origin, legacyRecord: legacy },
        createdAt: now,
      });
    return state;
  });
}
export type BlogMutationAction = "save" | "publish" | "unpublish" | "restore" | "delete";
export async function mutateBlogPublication(
  postId: string,
  actorId: string,
  proof: PagePreconditions,
  action: BlogMutationAction,
  options: { data?: BlogEditorialSnapshot; revisionId?: string } = {},
) {
  const parsed = pagePreconditionSchema.safeParse(proof);
  if (!parsed.success)
    throw new CmsMutationError(
      400,
      "CMS_CONCURRENCY_REQUIRED",
      "Version and editor lease are required.",
    );
  return db.transaction(async (tx) => {
    await lockBlogPublication(tx);
    const [state] = await tx.select().from(states).where(eq(states.postId, postId)).for("update");
    if (!state)
      throw new CmsMutationError(
        404,
        "BLOG_NOT_INITIALIZED",
        "Explicit initialization is required.",
      );
    if (state.visibility === "deleted") fail("BLOG_DELETED", "This post was deleted.");
    const [legacy] = await tx
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, postId))
      .for("update");
    if (!legacy || fingerprint(legacy) !== state.legacyFingerprint)
      fail("BLOG_LEGACY_DRIFT", "Legacy content changed; reconcile it before continuing.");
    const [lease] = await tx
      .select()
      .from(editorLocks)
      .where(and(eq(editorLocks.resourceType, "blog_post"), eq(editorLocks.resourceId, postId)))
      .for("update");
    const now = await databaseNow(tx);
    if (
      !lease ||
      lease.lockedByUserId !== actorId ||
      lease.editorInstanceId !== proof.editorInstanceId ||
      lease.id !== proof.leaseId ||
      lease.expiresAt <= now
    )
      fail("BLOG_LEASE_LOST", "This editor no longer owns the post.");
    if (state.version !== proof.expectedVersion)
      fail("BLOG_STALE", "This post changed; reload before continuing.");
    const [draft] = await tx
      .select()
      .from(revisions)
      .where(and(eq(revisions.postId, postId), eq(revisions.id, state.draftRevisionId)));
    let snapshot = blogEditorialSchema.parse(draft.snapshot),
      sourceRevisionId: string | null = draft.id;
    if (action === "save") snapshot = blogEditorialSchema.parse(options.data);
    if (action === "restore") {
      const [source] = await tx
        .select()
        .from(revisions)
        .where(and(eq(revisions.postId, postId), eq(revisions.id, options.revisionId ?? "")));
      if (!source) throw new CmsMutationError(404, "BLOG_REVISION_NOT_FOUND", "Revision not found");
      snapshot = blogEditorialSchema.parse(source.snapshot);
      sourceRevisionId = source.id;
    }
    if (action === "publish") {
      if (WEBSITE_OWNED_BLOG_SLUGS.has(snapshot.slug))
        fail(
          "BLOG_WEBSITE_OWNED_SLUG",
          "This existing website URL requires the explicit article import/ownership contract.",
        );
      const [owner] = await tx.select().from(routes).where(eq(routes.slug, snapshot.slug));
      if (owner && owner.postId !== postId)
        fail("BLOG_SLUG_OWNED", "This URL belongs to another post, including withdrawn URLs.");
    }
    const id = randomUUID(),
      version = state.version + 1;
    await tx
      .insert(revisions)
      .values({
        id,
        postId,
        version,
        snapshot,
        action,
        actorId,
        editorInstanceId: proof.editorInstanceId,
        sourceRevisionId,
        provenance: { kind: "editor-action", leaseId: proof.leaseId },
        createdAt: now,
      });
    const changes: Partial<typeof states.$inferInsert> = { version, updatedAt: now };
    if (action === "save" || action === "restore") changes.draftRevisionId = id;
    if (action === "publish" || action === "unpublish" || action === "delete") {
      const generation = state.publicationGeneration + 1;
      changes.publicationGeneration = generation;
      await tx
        .update(routes)
        .set({ state: "withdrawn", revisionId: null, generation, updatedAt: now })
        .where(eq(routes.postId, postId));
      if (action === "publish") {
        Object.assign(changes, {
          publishedRevisionId: id,
          lastPublishedRevisionId: id,
          visibility: "published",
          firstPublishedAt: state.firstPublishedAt ?? now,
          lastPublishedAt: now,
          withdrawnAt: null,
        });
        await tx
          .insert(routes)
          .values({
            slug: snapshot.slug,
            postId,
            generation,
            revisionId: id,
            state: "published",
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: routes.slug,
            set: { generation, revisionId: id, state: "published", updatedAt: now },
          });
      } else
        Object.assign(changes, {
          publishedRevisionId: null,
          visibility: action === "delete" ? "deleted" : "unpublished",
          withdrawnAt: now,
        });
    }
    const [result] = await tx
      .update(states)
      .set(changes)
      .where(eq(states.postId, postId))
      .returning();
    return result;
  });
}
/** Internal publication projection, not an HTTP response or HTML sanitizer. */
export async function readPublishedBlog(slug: string) {
  const [row] = await db
    .select({
      snapshot: revisions.snapshot,
      revisionId: revisions.id,
      generation: routes.generation,
      publishedAt: states.lastPublishedAt,
    })
    .from(routes)
    .innerJoin(
      states,
      and(eq(states.postId, routes.postId), eq(states.publishedRevisionId, routes.revisionId)),
    )
    .innerJoin(
      revisions,
      and(eq(revisions.postId, routes.postId), eq(revisions.id, routes.revisionId)),
    )
    .where(
      and(eq(routes.slug, slug), eq(routes.state, "published"), eq(states.visibility, "published")),
    );
  return row ? { ...row, snapshot: blogEditorialSchema.parse(row.snapshot) } : null;
}
