import { assertBlogCoverSetOwned } from "./blog-cover-image-set.service";
import { listStaticBlogRoutes } from "./blog-static-import-receipts.service";
import { STATIC_BLOG_SLUGS } from "@shared/public-blog";
import { resolvePublicBlogMedia } from "./public-blog-media.service";
import { projectPublicBlog, PublicBlogCapacityError } from "./public-blog-projection.service";
import { createHash, randomUUID } from "node:crypto";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "../db";
import { blogPosts, editorLocks, type BlogPost, type User } from "@shared/schema";
import {
  blogEditorialSchema,
  blogProvenanceSchema,
  blogPublicationState as states,
  blogPostRevisions as revisions,
  blogPublicationRoutes as routes,
  blogPublicationSchedules as schedules,
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
export const WEBSITE_OWNED_BLOG_SLUGS = new Set<string>(STATIC_BLOG_SLUGS);
export async function lockBlogPublication(tx: CmsTransaction) {
  await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended('blog-publication-writes', 0))`,
  );
}
export function legacyBlogFingerprint(post: BlogPost) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        Object.fromEntries(Object.entries(post).sort(([a], [b]) => a.localeCompare(b))),
      ),
    )
    .digest("hex");
}
export function legacyBlogEditorial(post: BlogPost) {
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
  return db.transaction((tx) => initializeBlogInTransaction(tx, postId, actorId, origin));
}
export async function initializeBlogInTransaction(
  tx: CmsTransaction,
  postId: string,
  actorId: string,
  origin: BlogProvenance,
  expectedFingerprint?: string,
  initialPresentation?: BlogEditorialSnapshot["presentation"],
  initialCoverImageSet?: null,
) {
  await lockBlogPublication(tx);
  if ((await tx.select().from(states).where(eq(states.postId, postId))).length)
    fail("BLOG_ALREADY_INITIALIZED", "This post already has publication state.");
  const [legacy] = await tx.select().from(blogPosts).where(eq(blogPosts.id, postId)).for("update");
  if (!legacy) throw new CmsMutationError(404, "BLOG_NOT_FOUND", "Post not found");
  if (expectedFingerprint && expectedFingerprint !== legacyBlogFingerprint(legacy))
    fail("BLOG_LEGACY_STALE", "Legacy content changed; reload before adoption.");
  const snapshot = blogEditorialSchema.parse({
      ...legacyBlogEditorial(legacy),
      ...(initialPresentation !== undefined ? { presentation: initialPresentation } : {}),
      ...(initialCoverImageSet !== undefined ? { coverImageSet: initialCoverImageSet } : {}),
    }),
    id = randomUUID(),
    now = await databaseNow(tx);
  const [state] = await tx
    .insert(states)
    .values({
      postId,
      version: 1,
      draftRevisionId: id,
      legacyFingerprint: legacyBlogFingerprint(legacy),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  await tx.insert(revisions).values({
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
}

export type BlogMutationAction =
  | "save"
  | "publish"
  | "unpublish"
  | "restore"
  | "delete"
  | "schedule"
  | "cancel_schedule";
export async function mutateBlogPublication(
  postId: string,
  actorId: string,
  proof: PagePreconditions,
  action: BlogMutationAction,
  options: { data?: BlogEditorialSnapshot; revisionId?: string; scheduledAt?: Date } = {},
) {
  const permitted: Record<BlogMutationAction, string[]> = {
    save: ["data"],
    publish: ["data"],
    unpublish: [],
    restore: ["revisionId"],
    delete: [],
    schedule: ["data", "scheduledAt"],
    cancel_schedule: [],
  };
  if (
    Object.entries(options).some(
      ([key, value]) => value !== undefined && !permitted[action]?.includes(key),
    )
  )
    throw new CmsMutationError(
      400,
      "BLOG_ACTION_PAYLOAD",
      "This action received unrelated fields.",
    );
  if ((action === "save" && !options.data) || (action === "restore" && !options.revisionId))
    throw new CmsMutationError(
      400,
      "BLOG_ACTION_PAYLOAD",
      "This action requires its draft or revision.",
    );
  const parsed = pagePreconditionSchema.safeParse(proof);
  if (!parsed.success)
    throw new CmsMutationError(
      400,
      "CMS_CONCURRENCY_REQUIRED",
      "Version and editor lease are required.",
    );
  return db.transaction((tx) => applyBlogMutation(tx, postId, actorId, proof, action, options));
}
async function applyBlogMutation(
  tx: CmsTransaction,
  postId: string,
  actorId: string,
  proof: PagePreconditions | null,
  action: BlogMutationAction | "scheduled_publish",
  options: {
    data?: BlogEditorialSnapshot;
    revisionId?: string;
    scheduledAt?: Date;
    scheduleId?: string;
  } = {},
) {
  await lockBlogPublication(tx);
  const [state] = await tx.select().from(states).where(eq(states.postId, postId)).for("update");
  if (!state)
    throw new CmsMutationError(404, "BLOG_NOT_INITIALIZED", "Explicit initialization is required.");
  if (state.visibility === "deleted") fail("BLOG_DELETED", "This post was deleted.");
  const [legacy] = await tx.select().from(blogPosts).where(eq(blogPosts.id, postId)).for("update");
  if (!legacy || legacyBlogFingerprint(legacy) !== state.legacyFingerprint)
    fail("BLOG_LEGACY_DRIFT", "Legacy content changed; reconcile it before continuing.");
  const [lease] = await tx
    .select()
    .from(editorLocks)
    .where(and(eq(editorLocks.resourceType, "blog_post"), eq(editorLocks.resourceId, postId)))
    .for("update");
  const now = await databaseNow(tx);
  if (
    proof &&
    (!lease ||
      lease.lockedByUserId !== actorId ||
      lease.editorInstanceId !== proof.editorInstanceId ||
      lease.id !== proof.leaseId ||
      lease.expiresAt <= now)
  )
    fail("BLOG_LEASE_LOST", "This editor no longer owns the post.");
  if (proof && state.version !== proof.expectedVersion)
    fail("BLOG_STALE", "This post changed; reload before continuing.");
  const [draft] = await tx
    .select()
    .from(revisions)
    .where(and(eq(revisions.postId, postId), eq(revisions.id, state.draftRevisionId)));
  let snapshot = blogEditorialSchema.parse(draft.snapshot),
    sourceRevisionId: string | null = draft.id;
  if (
    options.data &&
    options.data.coverImageSet === undefined &&
    snapshot.coverImageSet != null &&
    options.data.coverImageUrl !== snapshot.coverImageUrl
  )
    fail(
      "BLOG_COVER_SET_CHANGED",
      "This post has a responsive cover. Reload and explicitly clear its image set when choosing another cover.",
    );
  if (action === "save" || ((action === "publish" || action === "schedule") && options.data))
    snapshot = blogEditorialSchema.parse({
      ...options.data,
      ...(options.data?.coverImageSet === undefined && snapshot.coverImageSet !== undefined
        ? { coverImageSet: snapshot.coverImageSet }
        : {}),
      ...(options.data?.presentation === undefined && snapshot.presentation !== undefined
        ? { presentation: snapshot.presentation }
        : {}),
    });
  if (action === "scheduled_publish") {
    const [job] = await tx
      .select()
      .from(schedules)
      .where(and(eq(schedules.id, options.scheduleId ?? ""), eq(schedules.postId, postId)))
      .for("update");
    if (!job || job.status !== "pending" || job.scheduledAt > now)
      fail("BLOG_SCHEDULE_NOT_DUE", "Schedule is no longer pending and due.");
    const [pinned] = await tx
      .select()
      .from(revisions)
      .where(and(eq(revisions.postId, postId), eq(revisions.id, job.revisionId)));
    snapshot = blogEditorialSchema.parse(pinned.snapshot);
    sourceRevisionId = pinned.id;
  }
  if (
    action === "schedule" &&
    (!options.scheduledAt ||
      !Number.isFinite(options.scheduledAt.getTime()) ||
      options.scheduledAt <= now)
  )
    throw new CmsMutationError(
      400,
      "BLOG_INVALID_SCHEDULE",
      "Schedule must be a valid future date.",
    );
  if (action === "restore") {
    const [source] = await tx
      .select()
      .from(revisions)
      .where(and(eq(revisions.postId, postId), eq(revisions.id, options.revisionId ?? "")));
    if (!source) throw new CmsMutationError(404, "BLOG_REVISION_NOT_FOUND", "Revision not found");
    snapshot = blogEditorialSchema.parse(source.snapshot);
    sourceRevisionId = source.id;
  }
  if (["save", "publish", "schedule", "scheduled_publish", "restore"].includes(action))
    await assertBlogCoverSetOwned(postId, snapshot, tx);
  if (action === "publish" || action === "schedule" || action === "scheduled_publish") {
    if (
      WEBSITE_OWNED_BLOG_SLUGS.has(snapshot.slug) &&
      !(await listStaticBlogRoutes(tx)).some(
        (route) => route.slug === snapshot.slug && route.postId === postId,
      )
    )
      fail(
        "BLOG_WEBSITE_OWNED_SLUG",
        "This existing website URL requires the explicit article import/ownership contract.",
      );
    const [legacyOwner] = await tx
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, snapshot.slug));
    if (legacyOwner && legacyOwner.id !== postId)
      fail("BLOG_SLUG_OWNED", "This URL belongs to an existing legacy post.");
    const [owner] = await tx.select().from(routes).where(eq(routes.slug, snapshot.slug));
    if (owner && owner.postId !== postId)
      fail("BLOG_SLUG_OWNED", "This URL belongs to another post, including withdrawn URLs.");
  }
  const id = randomUUID(),
    version = state.version + 1;
  await tx.insert(revisions).values({
    id,
    postId,
    version,
    snapshot,
    action,
    actorId,
    editorInstanceId: proof?.editorInstanceId ?? null,
    sourceRevisionId,
    provenance: proof
      ? { kind: "editor-action", leaseId: proof.leaseId }
      : { kind: "scheduled-publication", scheduleId: options.scheduleId },
    createdAt: now,
  });
  const changes: Partial<typeof states.$inferInsert> = { version, updatedAt: now };
  if (action === "save" || action === "restore" || action === "publish" || action === "schedule")
    changes.draftRevisionId = id;
  if (["publish", "unpublish", "delete", "schedule", "cancel_schedule"].includes(action))
    await tx
      .update(schedules)
      .set({ status: "cancelled", completedAt: now })
      .where(and(eq(schedules.postId, postId), eq(schedules.status, "pending")));
  if (action === "schedule")
    await tx.insert(schedules).values({
      postId,
      revisionId: id,
      scheduledAt: options.scheduledAt!,
      createdVersion: version,
      actorId,
      createdAt: now,
    });
  if (action === "scheduled_publish")
    await tx
      .update(schedules)
      .set({ status: "published", completedAt: now })
      .where(eq(schedules.id, options.scheduleId!));
  if (
    action === "publish" ||
    action === "scheduled_publish" ||
    action === "unpublish" ||
    action === "delete"
  ) {
    const generation = state.publicationGeneration + 1;
    changes.publicationGeneration = generation;
    await tx
      .update(routes)
      .set({ state: "withdrawn", revisionId: null, generation, updatedAt: now })
      .where(eq(routes.postId, postId));
    if (action === "publish" || action === "scheduled_publish") {
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
  if (action === "publish" || action === "scheduled_publish" || action === "schedule") {
    const published = await listPublishedBlogSnapshots(tx);
    const candidate =
      action === "schedule"
        ? [
            ...published.filter((row) => row.id !== postId),
            {
              id: postId,
              revisionId: id,
              generation: state.publicationGeneration + 1,
              publishedAt: state.firstPublishedAt ?? now,
              modifiedAt: now,
              snapshot,
            },
          ]
        : published;
    try {
      projectPublicBlog(
        await resolvePublicBlogMedia(candidate, tx),
        await listStaticBlogRoutes(tx),
      );
    } catch (error) {
      if (error instanceof PublicBlogCapacityError)
        throw new CmsMutationError(400, "BLOG_PUBLICATION_LIMIT", error.message);
      throw error;
    }
  }
  return result;
}

/** Internal publication projection, not an HTTP response or HTML sanitizer. */
export async function readPublishedBlog(slug: string) {
  const [row] = await db
    .select({
      snapshot: revisions.snapshot,
      revisionId: revisions.id,
      generation: routes.generation,
      publishedAt: states.firstPublishedAt,
      modifiedAt: states.lastPublishedAt,
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

export async function listPublishedBlogSnapshots(reader: Pick<CmsTransaction, "select"> = db) {
  const rows = await reader
    .select({
      id: states.postId,
      snapshot: revisions.snapshot,
      revisionId: revisions.id,
      generation: routes.generation,
      publishedAt: states.firstPublishedAt,
      modifiedAt: states.lastPublishedAt,
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
    .where(and(eq(routes.state, "published"), eq(states.visibility, "published")));
  return rows.map((row) => ({ ...row, snapshot: blogEditorialSchema.parse(row.snapshot) }));
}
export async function publishDueBlogPublications() {
  return db.transaction(async (tx) => {
    await lockBlogPublication(tx);
    const now = await databaseNow(tx);
    const due = await tx
      .select()
      .from(schedules)
      .where(and(eq(schedules.status, "pending"), sql`${schedules.scheduledAt}<=${now}`))
      .orderBy(schedules.scheduledAt)
      .for("update");
    let count = 0;
    for (const job of due) {
      try {
        await tx.transaction((inner) =>
          applyBlogMutation(inner, job.postId, "system:blog-scheduler", null, "scheduled_publish", {
            scheduleId: job.id,
          }),
        );
        count++;
      } catch (error) {
        if (!(error instanceof CmsMutationError)) throw error;
        await tx
          .update(schedules)
          .set({ status: "failed", failureCode: error.code, completedAt: now })
          .where(eq(schedules.id, job.id));
        const [state] = await tx.select().from(states).where(eq(states.postId, job.postId));
        const [draft] = await tx
          .select()
          .from(revisions)
          .where(eq(revisions.id, state.draftRevisionId));
        await tx.insert(revisions).values({
          postId: job.postId,
          version: state.version + 1,
          snapshot: draft.snapshot,
          action: "schedule_failed",
          actorId: "system:blog-scheduler",
          sourceRevisionId: job.revisionId,
          provenance: { scheduleId: job.id, failureCode: error.code },
          createdAt: now,
        });
        await tx
          .update(states)
          .set({ version: state.version + 1, updatedAt: now })
          .where(eq(states.postId, job.postId));
      }
    }
    return count;
  });
}
export async function nextBlogPublicationTime() {
  const [job] = await db
    .select()
    .from(schedules)
    .where(eq(schedules.status, "pending"))
    .orderBy(schedules.scheduledAt)
    .limit(1);
  return job?.scheduledAt ?? null;
}
