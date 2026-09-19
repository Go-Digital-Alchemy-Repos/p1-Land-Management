import { eq, desc, and, sql, notExists } from "drizzle-orm";
import { db } from "../db";
import { blogPosts, type BlogPost, type InsertBlogPost } from "@shared/schema";

import {
  blogPublicationState as states,
  blogPublicationRoutes as routes,
} from "@shared/schema/blog-publications";
import { CmsMutationError } from "../services/cms-concurrency";
import {
  lockBlogPublication,
  listPublishedBlogSnapshots,
} from "../services/blog-publication.service";
import {
  sanitizedBlogSnapshot,
  listBlogPublications,
} from "../services/blog-publication-editor.service";
export class BlogStorage {
  async getPost(id: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async getPostBySlug(slug: string): Promise<BlogPost | undefined> {
    return (await this.getPublishedPosts()).find((post) => post.slug === slug);
  }
  async getPublishedPosts(): Promise<BlogPost[]> {
    const legacy = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.isPublished, true),
          notExists(db.select().from(states).where(eq(states.postId, blogPosts.id))),
        ),
      );
    const published = await listPublishedBlogSnapshots();
    const adapted = published.map(
      (row) =>
        ({
          ...sanitizedBlogSnapshot(row.snapshot),
          id: row.id,
          isPublished: true,
          publishedAt: row.publishedAt,
          scheduledAt: null,
          createdAt: row.publishedAt,
          updatedAt: row.modifiedAt,
        }) as BlogPost,
    );
    return [...legacy, ...adapted].sort(
      (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    );
  }

  async getAllPosts(): Promise<BlogPost[]> {
    return (await listBlogPublications()).map(
      ({ publication: _publication, ...post }) => post as BlogPost,
    );
  }

  async createPost(data: InsertBlogPost): Promise<BlogPost> {
    return db.transaction(async (tx) => {
      await lockBlogPublication(tx);
      if ((await tx.select().from(routes).where(eq(routes.slug, data.slug))).length)
        throw new CmsMutationError(
          409,
          "BLOG_SLUG_OWNED",
          "This URL is owned by publication history.",
        );
      const [post] = await tx.insert(blogPosts).values(data).returning();
      return post;
    });
  }

  async updatePost(
    id: string,
    data: Partial<InsertBlogPost>,
    skipAdopted = false,
  ): Promise<BlogPost | undefined> {
    return db.transaction(async (tx) => {
      await lockBlogPublication(tx);
      if ((await tx.select().from(states).where(eq(states.postId, id))).length) {
        if (skipAdopted) return undefined;
        throw new CmsMutationError(
          409,
          "BLOG_PUBLICATION_REQUIRED",
          "This post uses publication revisions. Reload the publication editor.",
        );
      }
      if (data.slug && (await tx.select().from(routes).where(eq(routes.slug, data.slug))).length)
        throw new CmsMutationError(
          409,
          "BLOG_SLUG_OWNED",
          "This URL is owned by publication history.",
        );
      const [post] = await tx
        .update(blogPosts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(blogPosts.id, id))
        .returning();
      return post;
    });
  }
  async deletePost(id: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      await lockBlogPublication(tx);
      if ((await tx.select().from(states).where(eq(states.postId, id))).length)
        throw new CmsMutationError(
          409,
          "BLOG_PUBLICATION_REQUIRED",
          "Use the publication editor to delete this post.",
        );
      await tx.delete(blogPosts).where(eq(blogPosts.id, id));
      return true;
    });
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

          return this.updatePost(
            post.id,
            {
              category: nextPrimaryCategory || nextCategories[0] || null,
              categories: nextCategories.length > 0 ? nextCategories : null,
              updatedAt: new Date(),
            } as Partial<InsertBlogPost>,
            true,
          );
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

          return this.updatePost(
            post.id,
            {
              tags: nextTags.length > 0 ? nextTags : null,
              updatedAt: new Date(),
            } as Partial<InsertBlogPost>,
            true,
          );
        }),
    );
  }

  async countPosts(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(blogPosts);
    return Number(result[0].count);
  }

  async countPublished(): Promise<number> {
    return (await this.getPublishedPosts()).length;
  }

  async publishScheduledPosts(): Promise<number> {
    return db.transaction(async (tx) => {
      await lockBlogPublication(tx);
      const now = new Date();
      const result = await tx
        .update(blogPosts)
        .set({ isPublished: true, publishedAt: now, scheduledAt: null, updatedAt: now })
        .where(
          and(
            eq(blogPosts.isPublished, false),
            notExists(tx.select().from(states).where(eq(states.postId, blogPosts.id))),
            sql`${blogPosts.scheduledAt} IS NOT NULL`,
            sql`${blogPosts.scheduledAt} <= ${now}`,
          ),
        )
        .returning();
      return result.length;
    });
  }

  async getNextScheduledTime(): Promise<Date | null> {
    const [row] = await db
      .select({ scheduledAt: blogPosts.scheduledAt })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.isPublished, false),
          sql`${blogPosts.scheduledAt} IS NOT NULL`,
          notExists(db.select().from(states).where(eq(states.postId, blogPosts.id))),
        ),
      )
      .orderBy(sql`${blogPosts.scheduledAt} ASC`)
      .limit(1);
    return row?.scheduledAt ?? null;
  }
}
