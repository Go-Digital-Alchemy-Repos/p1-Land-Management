import { sql } from "drizzle-orm";
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

export const WOO_IMPORT_RUN_STATUSES = [
  "planned",
  "applying",
  "completed",
  "failed",
  "rollback_pending",
  "rolled_back",
  "manual_review",
] as const;

export const WOO_IMPORT_RUN_MODES = ["rehearsal", "cutover"] as const;

export const wooImportRuns = pgTable(
  "woo_import_runs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contractVersion: text("contract_version").notNull(),
    sourceStoreId: text("source_store_id").notNull(),
    targetStackId: text("target_stack_id").notNull(),
    sourceFingerprint: text("source_fingerprint").notNull(),
    highWaterMark: text("high_water_mark").notNull(),
    mode: text("mode").notNull(),
    status: text("status").notNull().default("planned"),
    enabledPhases: integer("enabled_phases")
      .array()
      .notNull()
      .default(sql`ARRAY[]::integer[]`),
    operatorReference: text("operator_reference").notNull(),
    dispositionFingerprint: text("disposition_fingerprint"),
    dispositionApprovalReference: text("disposition_approval_reference"),
    latestCheckpoint: jsonb("latest_checkpoint").notNull().default({}),
    reconciliation: jsonb("reconciliation").notNull().default({}),
    failureCode: text("failure_code"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("woo_import_runs_active_target_unique")
      .on(table.sourceStoreId, table.targetStackId)
      .where(sql`${table.status} IN ('planned', 'applying', 'rollback_pending')`),
    index("idx_woo_import_runs_target_started").on(table.targetStackId, table.startedAt),
    index("idx_woo_import_runs_fingerprint").on(table.sourceStoreId, table.sourceFingerprint),
  ],
);

export const wooImportMappings = pgTable(
  "woo_import_mappings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sourceSystem: text("source_system").notNull().default("woocommerce"),
    sourceStoreId: text("source_store_id").notNull(),
    entityType: text("entity_type").notNull(),
    externalId: text("external_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: varchar("target_id").notNull(),
    firstRunId: varchar("first_run_id")
      .notNull()
      .references(() => wooImportRuns.id, { onDelete: "restrict" }),
    latestRunId: varchar("latest_run_id")
      .notNull()
      .references(() => wooImportRuns.id, { onDelete: "restrict" }),
    normalizedSourceHash: text("normalized_source_hash").notNull(),
    targetBaselineHash: text("target_baseline_hash").notNull(),
    lifecycleState: text("lifecycle_state").notNull().default("active"),
    latestImportedAt: timestamp("latest_imported_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("woo_import_mappings_source_unique").on(
      table.sourceSystem,
      table.sourceStoreId,
      table.entityType,
      table.externalId,
    ),
    uniqueIndex("woo_import_mappings_target_unique").on(
      table.sourceSystem,
      table.sourceStoreId,
      table.targetType,
      table.targetId,
    ),
    index("idx_woo_import_mappings_latest_run").on(table.latestRunId),
  ],
);

export const wooImportAuditEntries = pgTable(
  "woo_import_audit_entries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    runId: varchar("run_id")
      .notNull()
      .references(() => wooImportRuns.id, { onDelete: "restrict" }),
    batchKey: text("batch_key").notNull(),
    entityType: text("entity_type").notNull(),
    sourceRef: text("source_ref").notNull(),
    targetType: text("target_type"),
    targetId: varchar("target_id"),
    action: text("action").notNull(),
    priorSourceHash: text("prior_source_hash"),
    nextSourceHash: text("next_source_hash"),
    priorTargetHash: text("prior_target_hash"),
    nextTargetHash: text("next_target_hash"),
    outcome: text("outcome").notNull(),
    issueCode: text("issue_code"),
    rollbackSnapshot: jsonb("rollback_snapshot"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("woo_import_audit_run_batch_source_unique").on(
      table.runId,
      table.batchKey,
      table.entityType,
      table.sourceRef,
    ),
    index("idx_woo_import_audit_run_created").on(table.runId, table.createdAt),
  ],
);

export const wooImportQuarantineRecords = pgTable(
  "woo_import_quarantine_records",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    runId: varchar("run_id")
      .notNull()
      .references(() => wooImportRuns.id, { onDelete: "restrict" }),
    entityType: text("entity_type").notNull(),
    sourceRef: text("source_ref").notNull(),
    reasonCode: text("reason_code").notNull(),
    fieldNames: text("field_names")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    sourceHash: text("source_hash").notNull(),
    retryDisposition: text("retry_disposition").notNull().default("unresolved"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("woo_import_quarantine_run_source_reason_unique").on(
      table.runId,
      table.entityType,
      table.sourceRef,
      table.reasonCode,
    ),
    index("idx_woo_import_quarantine_run_disposition").on(table.runId, table.retryDisposition),
  ],
);

export type WooImportRun = typeof wooImportRuns.$inferSelect;
export type WooImportMapping = typeof wooImportMappings.$inferSelect;
export type WooImportAuditEntry = typeof wooImportAuditEntries.$inferSelect;
export type WooImportQuarantineRecord = typeof wooImportQuarantineRecords.$inferSelect;
