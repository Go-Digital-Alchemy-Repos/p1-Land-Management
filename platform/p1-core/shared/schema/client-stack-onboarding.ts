import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const CLIENT_STACK_ONBOARDING_EVIDENCE_KINDS = [
  "domain_plan",
  "dns_verification",
  "readiness_evaluation",
] as const;

export const clientStackOnboardingEvidence = pgTable(
  "client_stack_onboarding_evidence",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    stackId: text("stack_id").notNull(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    recordedByUserId: varchar("recorded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_client_stack_onboarding_evidence_stack_recorded").on(
      table.stackId,
      table.recordedAt,
    ),
  ],
);

export type ClientStackOnboardingEvidence = typeof clientStackOnboardingEvidence.$inferSelect;
