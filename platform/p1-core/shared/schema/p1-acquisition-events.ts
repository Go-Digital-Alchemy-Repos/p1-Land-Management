import { pgTable, bigint, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
export const p1AcquisitionEvents = pgTable("p1_acquisition_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  event: text("event").notNull(), path: text("path").notNull(),
  source: jsonb("source").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("p1_events_created").on(table.createdAt)]);
