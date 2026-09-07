import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { blogPosts } from "./blog-posts";
import { users } from "./users";

export const BLOG_COMMENT_STATUSES = ["pending", "approved", "spam", "rejected"] as const;
export type BlogCommentStatus = (typeof BLOG_COMMENT_STATUSES)[number];

export const blogComments = pgTable(
  "blog_comments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    postId: varchar("post_id")
      .references(() => blogPosts.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email"),
    body: text("body").notNull(),
    status: text("status").$type<BlogCommentStatus>().default("pending").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    moderationNote: text("moderation_note"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_blog_comments_post_status").on(table.postId, table.status, table.createdAt),
    index("idx_blog_comments_status").on(table.status, table.createdAt),
    index("idx_blog_comments_user").on(table.userId),
  ],
);

export const insertBlogCommentSchema = createInsertSchema(blogComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const publicBlogCommentSubmissionSchema = z.object({
  authorName: z.string().trim().max(120).optional().default(""),
  authorEmail: z.string().trim().email().optional().or(z.literal("")).default(""),
  body: z.string().trim().min(2, "Comment is required").max(5000, "Comment is too long"),
  website: z.string().trim().optional().default(""),
  honey: z.string().optional().default(""),
});

export const blogCommentSettingsSchema = z.object({
  commentsEnabled: z.boolean().default(false),
  allowGuestComments: z.boolean().default(false),
  allowLinksInComments: z.boolean().default(false),
  requireApproval: z.boolean().default(true),
  enableSpamProtection: z.boolean().default(true),
  enableHoneypot: z.boolean().default(true),
  enableRateLimit: z.boolean().default(true),
  rateLimitSeconds: z.number().int().min(10).max(86400).default(60),
  maxLinksPerComment: z.number().int().min(0).max(20).default(2),
});

export type BlogComment = typeof blogComments.$inferSelect;
export type InsertBlogComment = z.infer<typeof insertBlogCommentSchema>;
export type PublicBlogCommentSubmission = z.infer<typeof publicBlogCommentSubmissionSchema>;
export type BlogCommentSettings = z.infer<typeof blogCommentSettingsSchema>;
