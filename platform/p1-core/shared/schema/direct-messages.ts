import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: varchar("client_id")
      .notNull()
      .references(() => users.id),
    professionalId: varchar("professional_id")
      .notNull()
      .references(() => users.id),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_conv_client_id").on(table.clientId),
    index("idx_conv_counselor_id").on(table.professionalId),
    index("idx_conv_updated_at").on(table.updatedAt),
    index("idx_conv_participants").on(table.clientId, table.professionalId),
    index("idx_conv_last_message").on(table.lastMessageAt),
  ],
);

export const directMessages = pgTable(
  "direct_messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => conversations.id),
    senderId: varchar("sender_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    contentHtml: text("content_html"),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    attachmentType: text("attachment_type"),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_dm_conv_date").on(table.conversationId, table.createdAt),
    index("idx_dm_conv_read_sender").on(table.conversationId, table.isRead, table.senderId),
    index("idx_dm_sender_date").on(table.senderId, table.createdAt),
  ],
);

export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
