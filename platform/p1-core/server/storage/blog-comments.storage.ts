import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  blogComments,
  blogPosts,
  type BlogComment,
  type BlogCommentStatus,
  type InsertBlogComment,
} from "@shared/schema";

export interface AdminBlogCommentRecord extends BlogComment {
  postTitle: string;
  postSlug: string;
}

export class BlogCommentsStorage {
  async getApprovedCommentsByPostId(postId: string): Promise<BlogComment[]> {
    return db
      .select()
      .from(blogComments)
      .where(and(eq(blogComments.postId, postId), eq(blogComments.status, "approved")))
      .orderBy(blogComments.createdAt);
  }

  async getCommentById(id: string): Promise<BlogComment | undefined> {
    const [comment] = await db.select().from(blogComments).where(eq(blogComments.id, id));
    return comment;
  }

  async getCommentsForModeration(status?: BlogCommentStatus): Promise<AdminBlogCommentRecord[]> {
    const where = status ? eq(blogComments.status, status) : undefined;
    return db
      .select({
        id: blogComments.id,
        postId: blogComments.postId,
        userId: blogComments.userId,
        authorName: blogComments.authorName,
        authorEmail: blogComments.authorEmail,
        body: blogComments.body,
        status: blogComments.status,
        ipHash: blogComments.ipHash,
        userAgent: blogComments.userAgent,
        moderationNote: blogComments.moderationNote,
        createdAt: blogComments.createdAt,
        updatedAt: blogComments.updatedAt,
        postTitle: blogPosts.title,
        postSlug: blogPosts.slug,
      })
      .from(blogComments)
      .innerJoin(blogPosts, eq(blogComments.postId, blogPosts.id))
      .where(where)
      .orderBy(desc(blogComments.createdAt));
  }

  async createComment(data: InsertBlogComment): Promise<BlogComment> {
    const insertData: typeof blogComments.$inferInsert = {
      ...data,
      status: (data.status ?? "pending") as BlogCommentStatus,
    };
    const [comment] = await db.insert(blogComments).values(insertData).returning();
    return comment;
  }

  async updateCommentStatus(
    id: string,
    status: BlogCommentStatus,
    moderationNote?: string | null,
  ): Promise<BlogComment | undefined> {
    const [comment] = await db
      .update(blogComments)
      .set({
        status,
        moderationNote: moderationNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(blogComments.id, id))
      .returning();
    return comment;
  }

  async updateComment(
    id: string,
    updates: { body?: string; moderationNote?: string | null },
  ): Promise<BlogComment | undefined> {
    const nextValues: Partial<typeof blogComments.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof updates.body === "string") {
      nextValues.body = updates.body;
    }

    if (updates.moderationNote !== undefined) {
      nextValues.moderationNote = updates.moderationNote;
    }

    const [comment] = await db
      .update(blogComments)
      .set(nextValues)
      .where(eq(blogComments.id, id))
      .returning();
    return comment;
  }

  async deleteComment(id: string): Promise<boolean> {
    await db.delete(blogComments).where(eq(blogComments.id, id));
    return true;
  }

  async countByStatus(): Promise<Record<BlogCommentStatus, number>> {
    const rows = await db
      .select({
        status: blogComments.status,
        count: sql<number>`count(*)`,
      })
      .from(blogComments)
      .groupBy(blogComments.status);

    return {
      pending: Number(rows.find((row) => row.status === "pending")?.count ?? 0),
      approved: Number(rows.find((row) => row.status === "approved")?.count ?? 0),
      spam: Number(rows.find((row) => row.status === "spam")?.count ?? 0),
      rejected: Number(rows.find((row) => row.status === "rejected")?.count ?? 0),
    };
  }

  async findRecentCommentByIdentity(identity: {
    userId?: string | null;
    authorEmail?: string | null;
    ipHash?: string | null;
    since: Date;
  }): Promise<BlogComment | undefined> {
    const conditions = [];

    if (identity.userId) {
      conditions.push(eq(blogComments.userId, identity.userId));
    }
    if (identity.authorEmail) {
      conditions.push(eq(blogComments.authorEmail, identity.authorEmail));
    }
    if (identity.ipHash) {
      conditions.push(eq(blogComments.ipHash, identity.ipHash));
    }

    if (conditions.length === 0) return undefined;

    const [comment] = await db
      .select()
      .from(blogComments)
      .where(and(or(...conditions), gte(blogComments.createdAt, identity.since)))
      .orderBy(desc(blogComments.createdAt))
      .limit(1);

    return comment;
  }
}
