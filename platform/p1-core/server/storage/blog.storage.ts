import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../db";
import { blogPosts, type BlogPost, type InsertBlogPost } from "@shared/schema";

export class BlogStorage {
  async getPost(id: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async getPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async getPublishedPosts(): Promise<BlogPost[]> {
    return db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishedAt));
  }

  async getAllPosts(): Promise<BlogPost[]> {
    return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async createPost(data: InsertBlogPost): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts).values(data).returning();
    return post;
  }

  async updatePost(id: string, data: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const [post] = await db
      .update(blogPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return post;
  }

  async deletePost(id: string): Promise<boolean> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return true;
  }

  async renameCategoryReferences(previousName: string, nextName: string | null): Promise<void> {
    const posts = await this.getAllPosts();
    const target = previousName.trim().toLowerCase();

    await Promise.all(
      posts
        .filter((post) => {
          const primaryMatch = (post.category ?? "").trim().toLowerCase() === target;
          const categoryListMatch = (post.categories ?? []).some(
            (category) => category.trim().toLowerCase() === target,
          );
          return primaryMatch || categoryListMatch;
        })
        .map((post) => {
          const nextCategories = (post.categories ?? [])
            .map((category) => (category.trim().toLowerCase() === target ? nextName : category))
            .filter((category): category is string => Boolean(category))
            .filter(
              (category, index, arr) =>
                arr.findIndex(
                  (item) => item.trim().toLowerCase() === category.trim().toLowerCase(),
                ) === index,
            );

          const nextPrimaryCategory =
            (post.category ?? "").trim().toLowerCase() === target
              ? nextName
              : (post.category ?? nextCategories[0] ?? null);

          return this.updatePost(post.id, {
            category: nextPrimaryCategory || nextCategories[0] || null,
            categories: nextCategories.length > 0 ? nextCategories : null,
            updatedAt: new Date(),
          } as Partial<InsertBlogPost>);
        }),
    );
  }

  async renameTagReferences(previousName: string, nextName: string | null): Promise<void> {
    const posts = await this.getAllPosts();
    const target = previousName.trim().toLowerCase();

    await Promise.all(
      posts
        .filter((post) => (post.tags ?? []).some((tag) => tag.trim().toLowerCase() === target))
        .map((post) => {
          const nextTags = (post.tags ?? [])
            .map((tag) => (tag.trim().toLowerCase() === target ? nextName : tag))
            .filter((tag): tag is string => Boolean(tag))
            .filter(
              (tag, index, arr) =>
                arr.findIndex((item) => item.trim().toLowerCase() === tag.trim().toLowerCase()) ===
                index,
            );

          return this.updatePost(post.id, {
            tags: nextTags.length > 0 ? nextTags : null,
            updatedAt: new Date(),
          } as Partial<InsertBlogPost>);
        }),
    );
  }

  async countPosts(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(blogPosts);
    return Number(result[0].count);
  }

  async countPublished(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true));
    return Number(result[0].count);
  }

  async publishScheduledPosts(): Promise<number> {
    const now = new Date();
    const result = await db
      .update(blogPosts)
      .set({ isPublished: true, publishedAt: now, scheduledAt: null, updatedAt: now })
      .where(
        and(
          eq(blogPosts.isPublished, false),
          sql`${blogPosts.scheduledAt} IS NOT NULL`,
          sql`${blogPosts.scheduledAt} <= ${now}`,
        ),
      )
      .returning();
    return result.length;
  }

  async getNextScheduledTime(): Promise<Date | null> {
    const [row] = await db
      .select({ scheduledAt: blogPosts.scheduledAt })
      .from(blogPosts)
      .where(and(eq(blogPosts.isPublished, false), sql`${blogPosts.scheduledAt} IS NOT NULL`))
      .orderBy(sql`${blogPosts.scheduledAt} ASC`)
      .limit(1);
    return row?.scheduledAt ?? null;
  }
}
