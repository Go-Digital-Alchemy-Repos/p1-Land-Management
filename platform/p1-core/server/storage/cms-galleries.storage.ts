import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  cmsGalleries,
  cmsGalleryItems,
  users,
  type CmsGallery,
  type CmsGalleryItem,
  type CmsGalleryWithItems,
  type InsertCmsGallery,
  type InsertCmsGalleryItem,
} from "@shared/schema";

export interface GalleryListFilters {
  search?: string;
  status?: string;
  sort?: "updated" | "created" | "title";
}

export class CmsGalleriesStorage {
  async getAll(filters: GalleryListFilters = {}): Promise<CmsGalleryWithItems[]> {
    const conditions = [];
    if (filters.status && filters.status !== "all") {
      conditions.push(eq(cmsGalleries.status, filters.status));
    }
    if (filters.search) {
      const q = `%${filters.search}%`;
      conditions.push(or(ilike(cmsGalleries.title, q), ilike(cmsGalleries.slug, q)));
    }

    const rows = await db
      .select({
        gallery: cmsGalleries,
        imageCount: sql<number>`count(${cmsGalleryItems.id})`,
        authorName: sql<
          string | null
        >`nullif(trim(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')), '')`,
      })
      .from(cmsGalleries)
      .leftJoin(cmsGalleryItems, eq(cmsGalleryItems.galleryId, cmsGalleries.id))
      .leftJoin(users, eq(users.id, cmsGalleries.createdBy))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(cmsGalleries.id, users.id)
      .orderBy(
        filters.sort === "title"
          ? asc(cmsGalleries.title)
          : filters.sort === "created"
            ? desc(cmsGalleries.createdAt)
            : desc(cmsGalleries.updatedAt),
      );

    return rows.map((row) => ({
      ...row.gallery,
      items: [],
      imageCount: Number(row.imageCount ?? 0),
      authorName: row.authorName,
    }));
  }

  async getById(id: string): Promise<CmsGalleryWithItems | undefined> {
    const [gallery] = await db.select().from(cmsGalleries).where(eq(cmsGalleries.id, id));
    if (!gallery) return undefined;
    return this.withItems(gallery);
  }

  async getBySlug(slug: string): Promise<CmsGalleryWithItems | undefined> {
    const [gallery] = await db.select().from(cmsGalleries).where(eq(cmsGalleries.slug, slug));
    if (!gallery) return undefined;
    return this.withItems(gallery);
  }

  async getByIdOrSlug(identifier: string): Promise<CmsGalleryWithItems | undefined> {
    return (await this.getById(identifier)) ?? this.getBySlug(identifier);
  }

  async getPublishedById(id: string): Promise<CmsGalleryWithItems | undefined> {
    const gallery = await this.getById(id);
    return gallery?.status === "published" ? gallery : undefined;
  }

  async getPublishedByIdOrSlug(identifier: string): Promise<CmsGalleryWithItems | undefined> {
    const gallery = await this.getByIdOrSlug(identifier);
    return gallery?.status === "published" ? gallery : undefined;
  }

  async create(
    data: InsertCmsGallery,
    items: InsertCmsGalleryItem[],
  ): Promise<CmsGalleryWithItems> {
    const [gallery] = await db.insert(cmsGalleries).values(data).returning();
    await this.replaceItems(gallery.id, items);
    const created = await this.getById(gallery.id);
    if (!created) throw new Error("Failed to create gallery");
    return created;
  }

  async update(
    id: string,
    data: Partial<InsertCmsGallery>,
    items?: InsertCmsGalleryItem[],
  ): Promise<CmsGalleryWithItems | undefined> {
    const [gallery] = await db
      .update(cmsGalleries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cmsGalleries.id, id))
      .returning();
    if (!gallery) return undefined;
    if (items) {
      await this.replaceItems(id, items);
    }
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(cmsGalleries).where(eq(cmsGalleries.id, id)).returning();
    return result.length > 0;
  }

  async duplicate(id: string, adminId: string): Promise<CmsGalleryWithItems | undefined> {
    const gallery = await this.getById(id);
    if (!gallery) return undefined;
    const baseSlug = `${gallery.slug}-copy`;
    let slug = baseSlug;
    let suffix = 1;
    while (await this.getBySlug(slug)) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return this.create(
      {
        title: `${gallery.title} Copy`,
        slug,
        description: gallery.description,
        status: "draft",
        layout: gallery.layout,
        settings: gallery.settings,
        createdBy: adminId,
        updatedBy: adminId,
        publishedAt: null,
      },
      gallery.items.map((item, index) => ({
        galleryId: "",
        mediaId: item.mediaId,
        imageUrl: item.imageUrl,
        alt: item.alt,
        title: item.title,
        caption: item.caption,
        linkUrl: item.linkUrl,
        ctaText: item.ctaText,
        tags: item.tags,
        sortOrder: index,
      })),
    );
  }

  async publish(id: string, adminId: string): Promise<CmsGalleryWithItems | undefined> {
    return this.update(id, {
      status: "published",
      updatedBy: adminId,
      publishedAt: new Date(),
    });
  }

  async unpublish(id: string, adminId: string): Promise<CmsGalleryWithItems | undefined> {
    return this.update(id, {
      status: "draft",
      updatedBy: adminId,
      publishedAt: null,
    });
  }

  private async replaceItems(galleryId: string, items: InsertCmsGalleryItem[]) {
    await db.delete(cmsGalleryItems).where(eq(cmsGalleryItems.galleryId, galleryId));
    const values = items.map((item, index) => ({
      ...item,
      galleryId,
      sortOrder: item.sortOrder ?? index,
    }));
    if (values.length) {
      await db.insert(cmsGalleryItems).values(values);
    }
  }

  private async withItems(gallery: CmsGallery): Promise<CmsGalleryWithItems> {
    const items = await db
      .select()
      .from(cmsGalleryItems)
      .where(eq(cmsGalleryItems.galleryId, gallery.id))
      .orderBy(asc(cmsGalleryItems.sortOrder), asc(cmsGalleryItems.createdAt));
    return {
      ...gallery,
      items: items as CmsGalleryItem[],
      imageCount: items.length,
    };
  }
}
