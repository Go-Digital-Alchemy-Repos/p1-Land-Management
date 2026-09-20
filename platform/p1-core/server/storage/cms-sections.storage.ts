import { db } from "../db";
import {
  cmsSections,
  type CmsSection,
  type InsertCmsSection,
  editorLocks,
  insertCmsSectionSchema,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

import { CmsMutationError, databaseNow, type PagePreconditions } from "../services/cms-concurrency";
import {
  lockSectionLibrary,
  lockSectionResource,
  assertSectionLease,
} from "../services/cms-section-concurrency";

export class CmsSectionsStorage {
  async getAllSections(): Promise<CmsSection[]> {
    return db.select().from(cmsSections).orderBy(desc(cmsSections.createdAt));
  }

  async getSectionsByCategory(category: string): Promise<CmsSection[]> {
    return db
      .select()
      .from(cmsSections)
      .where(eq(cmsSections.category, category))
      .orderBy(desc(cmsSections.createdAt));
  }

  async getSection(id: string): Promise<CmsSection | undefined> {
    const [section] = await db.select().from(cmsSections).where(eq(cmsSections.id, id));
    return section;
  }

  async createSection(data: InsertCmsSection): Promise<CmsSection> {
    const input = insertCmsSectionSchema.parse(data);
    return db.transaction(async (tx) => {
      await lockSectionLibrary(tx);
      const [section] = await tx.insert(cmsSections).values(input).returning();
      return section;
    });
  }

  async updateSection(
    id: string,
    data: Partial<InsertCmsSection>,
    actorId: string,
    proof: PagePreconditions,
  ): Promise<CmsSection> {
    return db.transaction(async (tx) => {
      await lockSectionResource(tx, id);
      const [existing] = await tx
        .select()
        .from(cmsSections)
        .where(eq(cmsSections.id, id))
        .for("update");
      if (!existing) throw new CmsMutationError(404, "CMS_SECTION_NOT_FOUND", "Section not found");
      const now = await assertSectionLease(tx, id, actorId, proof);
      if (existing.version !== proof.expectedVersion)
        throw new CmsMutationError(
          409,
          "CMS_SECTION_STALE",
          "This section changed. Reload before saving; your draft is retained.",
          { currentVersion: existing.version },
        );
      const [section] = await tx
        .update(cmsSections)
        .set({ ...data, version: existing.version + 1, updatedAt: now })
        .where(eq(cmsSections.id, id))
        .returning();
      return section;
    });
  }

  async deleteSection(id: string, actorId: string, proof: PagePreconditions): Promise<boolean> {
    return db.transaction(async (tx) => {
      await lockSectionResource(tx, id);
      const [existing] = await tx
        .select()
        .from(cmsSections)
        .where(eq(cmsSections.id, id))
        .for("update");
      if (!existing) throw new CmsMutationError(404, "CMS_SECTION_NOT_FOUND", "Section not found");
      await assertSectionLease(tx, id, actorId, proof);
      if (existing.version !== proof.expectedVersion)
        throw new CmsMutationError(
          409,
          "CMS_SECTION_STALE",
          "This section changed. Reload before deleting.",
          { currentVersion: existing.version },
        );
      await tx.delete(cmsSections).where(eq(cmsSections.id, id));
      await tx
        .delete(editorLocks)
        .where(and(eq(editorLocks.resourceType, "cms_section"), eq(editorLocks.resourceId, id)));
      return true;
    });
  }

  async ensureSystemSections(
    team: InsertCmsSection,
    starters: InsertCmsSection[],
    refreshExisting: boolean,
  ) {
    return db.transaction(async (tx) => {
      await lockSectionLibrary(tx, true);
      const existing = await tx.select().from(cmsSections).orderBy(cmsSections.id).for("update");
      const byName = new Map(existing.map((section) => [section.name, section]));
      const desired = new Set(starters.map((section) => section.name));
      const affected = refreshExisting
        ? existing.filter(
            (section) => section.name.startsWith("Starter - ") || desired.has(section.name),
          )
        : [];
      const leases = await tx
        .select()
        .from(editorLocks)
        .where(eq(editorLocks.resourceType, "cms_section"))
        .for("update");
      const now = await databaseNow(tx);
      if (
        affected.some((section) =>
          leases.some((lease) => lease.resourceId === section.id && lease.expiresAt > now),
        )
      )
        throw new CmsMutationError(
          409,
          "CMS_SECTION_RESERVED",
          "Starter sections are being edited. Close their editors before restoring the library.",
        );
      let created = 0,
        updated = 0,
        deleted = 0;
      if (!byName.has(team.name)) {
        await tx.insert(cmsSections).values(team);
        created++;
      }
      for (const section of affected) {
        if (!desired.has(section.name)) {
          await tx.delete(cmsSections).where(eq(cmsSections.id, section.id));
          await tx
            .delete(editorLocks)
            .where(
              and(
                eq(editorLocks.resourceType, "cms_section"),
                eq(editorLocks.resourceId, section.id),
              ),
            );
          deleted++;
        }
      }
      for (const record of starters) {
        const previous = byName.get(record.name);
        if (!previous) {
          await tx.insert(cmsSections).values(record);
          created++;
        } else if (refreshExisting) {
          await tx
            .update(cmsSections)
            .set({ ...record, version: previous.version + 1, updatedAt: now })
            .where(eq(cmsSections.id, previous.id));
          updated++;
        }
      }
      return { created, updated, deleted, total: starters.length + 1 };
    });
  }
}
