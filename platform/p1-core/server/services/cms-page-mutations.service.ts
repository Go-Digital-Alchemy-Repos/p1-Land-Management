import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  cmsPages,
  cmsPageRevisions,
  cmsMenus,
  editorLocks,
  type CmsPage,
  type InsertCmsPage,
  type MenuItem,
} from "@shared/schema";
import {
  CmsMutationError,
  databaseNow,
  lockMenus,
  lockPageResource,
  type CmsTransaction,
  type PagePreconditions,
} from "./cms-concurrency";
import {
  collectMenuReferences,
  removeMenuItemsForPage,
  syncMenuItemsWithPage,
} from "./cms-relationships.service";
export type PageMutationAction =
  | "save"
  | "publish"
  | "unpublish"
  | "schedule"
  | "restore"
  | "delete"
  | "remove-menu-items";
async function revision(tx: CmsTransaction, page: CmsPage, actor: string | null, note: string) {
  await tx
    .insert(cmsPageRevisions)
    .values({
      pageId: page.id,
      title: page.title,
      content: page.content,
      status: page.status,
      changedBy: actor,
      changeNote: note,
    });
}
export async function createPageWithRevision(data: InsertCmsPage, note = "Initial creation") {
  return db.transaction(async (tx) => {
    const [page] = await tx.insert(cmsPages).values(data).returning();
    await revision(tx, page, data.createdBy ?? null, note);
    return page;
  });
}
export async function mutateCmsPage(
  identifier: string,
  actorId: string,
  preconditions: PagePreconditions,
  action: PageMutationAction,
  options: {
    data?: Partial<InsertCmsPage>;
    force?: boolean;
    scheduledAt?: Date;
    revisionId?: string;
  } = {},
) {
  return db.transaction(async (tx) => {
    // Read only to resolve legacy slug callers; all decisions use the locked reread.
    const [resolved] = await tx
      .select({ id: cmsPages.id })
      .from(cmsPages)
      .where(or(eq(cmsPages.id, identifier), eq(cmsPages.slug, identifier)))
      .orderBy(sql`CASE WHEN ${cmsPages.id} = ${identifier} THEN 0 ELSE 1 END`)
      .limit(1);
    if (!resolved) throw new CmsMutationError(404, "CMS_PAGE_NOT_FOUND", "Page not found");
    await lockPageResource(tx, resolved.id);
    const [page] = await tx
      .select()
      .from(cmsPages)
      .where(eq(cmsPages.id, resolved.id))
      .for("update");
    if (!page) throw new CmsMutationError(404, "CMS_PAGE_NOT_FOUND", "Page not found");
    const [lease] = await tx
      .select()
      .from(editorLocks)
      .where(and(eq(editorLocks.resourceType, "cms_page"), eq(editorLocks.resourceId, page.id)))
      .for("update");
    let now = await databaseNow(tx);
    if (
      !lease ||
      lease.lockedByUserId !== actorId ||
      lease.editorInstanceId !== preconditions.editorInstanceId ||
      lease.id !== preconditions.leaseId ||
      lease.expiresAt <= now
    )
      throw new CmsMutationError(
        409,
        "CMS_PAGE_LEASE_LOST",
        "This editor no longer owns the page. Your draft is retained; reacquire editing access before continuing.",
      );
    if (page.version !== preconditions.expectedVersion)
      throw new CmsMutationError(
        409,
        "CMS_PAGE_STALE",
        "This page changed. Reload the saved page before continuing.",
        { currentVersion: page.version },
      );
    await lockMenus(tx);
    const menus = await tx.select().from(cmsMenus).orderBy(cmsMenus.id).for("update");
    now = await databaseNow(tx);
    if (lease.expiresAt <= now)
      throw new CmsMutationError(
        409,
        "CMS_PAGE_LEASE_LOST",
        "This editor lease expired while waiting. Reacquire editing access before continuing.",
      );
    const refs = menus.flatMap((menu) =>
      collectMenuReferences((menu.items as MenuItem[]) || [], page, menu),
    );
    if ((action === "delete" || action === "unpublish") && refs.length && !options.force)
      throw new CmsMutationError(
        409,
        "CMS_PAGE_HAS_MENU_REFERENCES",
        "This page is still used in navigation menus. Review linked references before continuing.",
        { menuReferences: refs },
      );
    if (action === "delete") {
      if (page.status === "published" && !options.force)
        throw new CmsMutationError(
          400,
          "CMS_PAGE_PUBLISHED",
          "Cannot delete a published page. Unpublish it first or use ?force=true",
        );
      await tx.delete(cmsPages).where(eq(cmsPages.id, page.id));
      await tx.delete(editorLocks).where(eq(editorLocks.id, lease.id));
      return { success: true };
    }
    if (action === "remove-menu-items") {
      let menusUpdated = 0,
        itemsRemoved = 0;
      for (const menu of menus) {
        const result = removeMenuItemsForPage((menu.items as MenuItem[]) || [], page);
        if (!result.changed) continue;
        await tx
          .update(cmsMenus)
          .set({ items: result.items, version: sql`${cmsMenus.version}+1`, updatedAt: now })
          .where(eq(cmsMenus.id, menu.id));
        menusUpdated++;
        itemsRemoved += result.itemsRemoved;
      }
      return { success: true, version: page.version, menusUpdated, itemsRemoved };
    }
    let data: Partial<InsertCmsPage> = {};
    if (action === "save") {
      data = options.data ?? {};
      if (data.status === "scheduled" && page.status !== "scheduled")
        throw new CmsMutationError(
          400,
          "CMS_PAGE_SCHEDULE_REQUIRED",
          "Use the schedule endpoint to schedule a page",
        );
    } else if (action === "publish")
      data = { status: "published", publishedAt: now, scheduledAt: null };
    else if (action === "unpublish")
      data = { status: "draft", publishedAt: null, scheduledAt: null };
    else if (action === "schedule") {
      if (
        !options.scheduledAt ||
        !Number.isFinite(options.scheduledAt.getTime()) ||
        options.scheduledAt <= now
      )
        throw new CmsMutationError(
          400,
          "CMS_PAGE_INVALID_SCHEDULE",
          "scheduledAt must be a valid future date",
        );
      data = { status: "scheduled", scheduledAt: options.scheduledAt, publishedAt: null };
    } else if (action === "restore") {
      const [prior] = await tx
        .select()
        .from(cmsPageRevisions)
        .where(
          and(
            eq(cmsPageRevisions.id, options.revisionId ?? ""),
            eq(cmsPageRevisions.pageId, page.id),
          ),
        );
      if (!prior)
        throw new CmsMutationError(404, "CMS_PAGE_REVISION_NOT_FOUND", "Revision not found");
      data = { title: prior.title, content: prior.content as InsertCmsPage["content"] };
    }
    await revision(
      tx,
      page,
      actorId,
      action === "restore" ? "Before restore" : action === "save" ? "Updated" : `Before ${action}`,
    );
    const [updated] = await tx
      .update(cmsPages)
      .set({ ...data, updatedBy: actorId, updatedAt: now, version: sql`${cmsPages.version}+1` })
      .where(eq(cmsPages.id, page.id))
      .returning();
    if (action === "restore") await revision(tx, updated, actorId, "Restored from revision");
    for (const menu of menus) {
      const result = syncMenuItemsWithPage((menu.items as MenuItem[]) || [], page, updated);
      if (result.changed)
        await tx
          .update(cmsMenus)
          .set({ items: result.items, version: sql`${cmsMenus.version}+1`, updatedAt: now })
          .where(eq(cmsMenus.id, menu.id));
    }
    return updated;
  });
}
