import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const clientSiteContent = pgTable(
  "client_site_content",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    stackId: text("stack_id").notNull(),
    routeId: text("route_id").notNull(),
    componentKey: text("component_key").notNull(),
    draftContent: jsonb("draft_content").notNull().default({}),
    publishedContent: jsonb("published_content"),
    draftRevision: integer("draft_revision").notNull().default(0),
    publishedRevision: integer("published_revision"),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
    publishedBy: varchar("published_by").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("client_site_content_identity_unique").on(
      table.stackId,
      table.routeId,
      table.componentKey,
    ),
    index("idx_client_site_content_published").on(
      table.stackId,
      table.routeId,
      table.componentKey,
      table.publishedRevision,
    ),
  ],
);

export const clientSiteContentRevisions = pgTable(
  "client_site_content_revisions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => clientSiteContent.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    content: jsonb("content").notNull(),
    kind: text("kind").notNull(),
    changedBy: varchar("changed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("client_site_content_revision_unique").on(table.contentId, table.revision),
    index("idx_client_site_content_revisions_created").on(table.contentId, table.createdAt),
  ],
);

export const clientSiteContentRelations = relations(clientSiteContent, ({ many }) => ({
  revisions: many(clientSiteContentRevisions),
}));

export const clientSiteContentRevisionRelations = relations(
  clientSiteContentRevisions,
  ({ one }) => ({
    content: one(clientSiteContent, {
      fields: [clientSiteContentRevisions.contentId],
      references: [clientSiteContent.id],
    }),
  }),
);

export type ClientSiteContent = typeof clientSiteContent.$inferSelect;
export type ClientSiteContentRevision = typeof clientSiteContentRevisions.$inferSelect;
