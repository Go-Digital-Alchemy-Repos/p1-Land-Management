import { sql } from "drizzle-orm";
import { pgSchema,uuid,text,timestamp,check } from "drizzle-orm/pg-core";
// Deliberately outside public: website archive restores must never replace these receipts.
const operations = pgSchema("p1_operations");
export const restoreReceipts = operations.table("restore_receipts",{
  operationId:uuid("operation_id").primaryKey(),
  actorId:text("actor_id").notNull(),
  fingerprint:text("fingerprint").notNull(),
  expiresAt:timestamp("expires_at",{withTimezone:true}).notNull(),
  status:text("status").notNull().default("started"),
  startedAt:timestamp("started_at",{withTimezone:true}).notNull().defaultNow(),
  completedAt:timestamp("completed_at",{withTimezone:true}),
},table=>[
  check("restore_receipts_fingerprint_check",sql`${table.fingerprint} ~ '^[a-f0-9]{64}$'`),
  check("restore_receipts_status_check",sql`${table.status} IN ('started','completed')`),
  check("restore_receipts_check",sql`(${table.status} = 'completed') = (${table.completedAt} IS NOT NULL)`),
]);
