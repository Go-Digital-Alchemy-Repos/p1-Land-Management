import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";

export const EDITOR_LOCK_RESOURCE_TYPES = [
  "cms_page",
  "blog_post",
  "event",
  "form",
  "cms_section",
  "cms_menu",
  "cms_sidebar",
  "doc",
  "email_template",
] as const;

export const editorLockResourceTypeSchema = z.enum(EDITOR_LOCK_RESOURCE_TYPES);
export type EditorLockResourceType = z.infer<typeof editorLockResourceTypeSchema>;

export const EDITOR_LOCK_STATUSES = ["acquired", "locked_by_other", "expired_available"] as const;

export const editorLockStatusSchema = z.enum(EDITOR_LOCK_STATUSES);
export type EditorLockStatus = z.infer<typeof editorLockStatusSchema>;

export const editorLocks = pgTable(
  "editor_locks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    lockedByUserId: text("locked_by_user_id").notNull(),
    lockedByName: text("locked_by_name").notNull(),
    lockedAt: timestamp("locked_at").notNull().defaultNow(),
    lastHeartbeatAt: timestamp("last_heartbeat_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("editor_locks_resource_unique").on(table.resourceType, table.resourceId)],
);

export const insertEditorLockSchema = createInsertSchema(editorLocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEditorLock = z.infer<typeof insertEditorLockSchema>;
export type EditorLock = typeof editorLocks.$inferSelect;

export const editorLockRequestSchema = z.object({
  resourceType: editorLockResourceTypeSchema,
  resourceId: z.string().min(1),
});

export const editorLockResponseSchema = z.object({
  status: editorLockStatusSchema,
  resourceType: editorLockResourceTypeSchema,
  resourceId: z.string().min(1),
  ownedByCurrentUser: z.boolean(),
  lock: z
    .object({
      id: z.string(),
      lockedByUserId: z.string(),
      lockedByName: z.string(),
      lockedAt: z.string(),
      lastHeartbeatAt: z.string(),
      expiresAt: z.string(),
    })
    .nullable(),
});

export type EditorLockResponse = z.infer<typeof editorLockResponseSchema>;
