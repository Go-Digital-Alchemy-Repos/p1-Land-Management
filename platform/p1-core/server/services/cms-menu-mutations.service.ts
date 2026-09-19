import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { cmsMenus, type InsertCmsMenu } from "@shared/schema";
import { CmsMutationError, databaseNow, lockMenus } from "./cms-concurrency";
export async function mutateCmsMenu(
  id: string | null,
  data: Partial<InsertCmsMenu>,
  expectedVersion?: number,
  remove = false,
) {
  return db.transaction(async (tx) => {
    await lockMenus(tx);
    const now = await databaseNow(tx);
    const [existing] = id
      ? await tx.select().from(cmsMenus).where(eq(cmsMenus.id, id)).for("update")
      : [];
    if (id && !existing) throw new CmsMutationError(404, "CMS_MENU_NOT_FOUND", "Menu not found");
    if (existing && existing.version !== expectedVersion)
      throw new CmsMutationError(
        409,
        "CMS_MENU_STALE",
        "This menu changed. Reload the saved menu before continuing.",
        { currentVersion: existing.version },
      );
    if (remove) {
      await tx.delete(cmsMenus).where(eq(cmsMenus.id, id!));
      return { success: true };
    }
    if (data.location && data.location !== "unassigned" && data.location !== existing?.location) {
      await tx
        .update(cmsMenus)
        .set({ location: "unassigned", updatedAt: now, version: sql`${cmsMenus.version}+1` })
        .where(and(eq(cmsMenus.location, data.location), id ? ne(cmsMenus.id, id) : undefined));
    }
    if (existing) {
      const [updated] = await tx
        .update(cmsMenus)
        .set({ ...data, updatedAt: now, version: sql`${cmsMenus.version}+1` })
        .where(eq(cmsMenus.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await tx
      .insert(cmsMenus)
      .values(data as InsertCmsMenu)
      .returning();
    return created;
  });
}
