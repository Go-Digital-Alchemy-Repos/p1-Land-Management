// Generated from dashboard SQL migrations 0001–0009; empty-string defaults corrected after introspection.
import {
  pgTable,
  type AnyPgColumn,
  text,
  timestamp,
  unique,
  boolean,
  index,
  foreignKey,
  check,
  integer,
  uuid,
  numeric,
  jsonb,
  uniqueIndex,
  date,
  bigint,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const dashboardMigration = pgTable("dashboard_migration", {
  name: text().primaryKey().notNull(),
  checksum: text().notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

export const user = pgTable(
  "user",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().default(false).notNull(),
    image: text(),
    createdAt: timestamp({ withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    twoFactorEnabled: boolean().default(false),
  },
  (table) => [unique("user_email_key").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp({ withTimezone: true, mode: "string" }).notNull(),
    token: text().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text().notNull(),
  },
  (table) => [
    index("session_userId_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "session_userId_fkey",
    }).onDelete("cascade"),
    unique("session_token_key").on(table.token),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey().notNull(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true, mode: "string" }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true, mode: "string" }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "account_userId_fkey",
    }).onDelete("cascade"),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey().notNull(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("verification_identifier_idx").using(
      "btree",
      table.identifier.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const installation = pgTable(
  "installation",
  {
    id: integer().primaryKey().notNull(),
    ownerId: text("owner_id"),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [user.id],
      name: "installation_owner_id_fkey",
    }),
    check("installation_id_check", sql`id = 1`),
  ],
);

export const staffProfile = pgTable(
  "staff_profile",
  {
    userId: text("user_id").primaryKey().notNull(),
    role: text().notNull(),
    active: boolean().default(true).notNull(),
    mfaRequired: boolean("mfa_required").default(false).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "staff_profile_user_id_fkey",
    }),
    check(
      "staff_profile_role_check",
      sql`role = ANY (ARRAY['owner'::text, 'manager'::text, 'dispatch'::text, 'sales'::text, 'finance'::text, 'crew'::text, 'client'::text])`,
    ),
  ],
);

export const client = pgTable(
  "client",
  {
    id: uuid().primaryKey().notNull(),
    name: text().notNull(),
    email: text(),
    phone: text(),
    billingAddress: text("billing_address"),
    quickbooksId: text("quickbooks_id"),
    archived: boolean().default(false).notNull(),
    version: integer().default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("client_quickbooks_id_key").on(table.quickbooksId)],
);

export const contact = pgTable(
  "contact",
  {
    id: uuid().primaryKey().notNull(),
    clientId: uuid("client_id"),
    name: text().notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text(),
    phone: text(),
    position: text(),
    kind: text().default("site").notNull(),
    reviewedBy: text("reviewed_by").references(() => user.id),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "string",
    }),
    channelSource: text("channel_source"),
    archived: boolean().default(false).notNull(),
    version: integer().default(1).notNull(),
  },
  (table) => [
    check(
      "contact_prospect_channel",
      sql`client_id IS NOT NULL OR NULLIF(btrim(email),'') IS NOT NULL OR NULLIF(btrim(phone),'') IS NOT NULL`,
    ),
    index("contact_client_active_idx")
      .on(table.clientId)
      .where(sql`${table.archived} = false`),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "contact_client_id_fkey",
    }),
  ],
);

export const property = pgTable(
  "property",
  {
    id: uuid().primaryKey().notNull(),
    clientId: uuid("client_id"),
    name: text().notNull(),
    address: text().notNull(),
    acreage: numeric(),
    lifecycle: text().default("operational").notNull(),
    version: integer().default(1).notNull(),
    locationPrecision: text("location_precision"),
    salesOwnerId: text("sales_owner_id").references(() => user.id),
    accessInstructions: text("access_instructions").default("").notNull(),
    notes: text().default("").notNull(),
    archived: boolean().default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "property_lifecycle_client",
      sql`(lifecycle='prospect' AND client_id IS NULL) OR (lifecycle='operational' AND client_id IS NOT NULL)`,
    ),
    check(
      "property_location_precision",
      sql`location_precision IS NULL OR location_precision IN ('region','approximate','confirmed')`,
    ),
    index("property_lifecycle_active").on(
      table.lifecycle,
      table.archived,
      table.id,
    ),
    index("property_client_id_idx").using(
      "btree",
      table.clientId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "property_client_id_fkey",
    }),
    check("property_acreage_check", sql`acreage >= (0)::numeric`),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: uuid().primaryKey().notNull(),
    email: text().notNull(),
    role: text().notNull(),
    clientId: uuid("client_id"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    acceptedAt: timestamp("accepted_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "invitation_client_id_fkey",
    }),
    unique("invitation_token_hash_key").on(table.tokenHash),
    check(
      "invitation_role_check",
      sql`role = ANY (ARRAY['manager'::text, 'dispatch'::text, 'sales'::text, 'finance'::text, 'crew'::text, 'client'::text])`,
    ),
    check(
      "invitation_check",
      sql`(role <> 'client'::text) OR (client_id IS NOT NULL)`,
    ),
  ],
);

export const fieldEvent = pgTable(
  "field_event",
  {
    id: uuid().primaryKey().notNull(),
    workOrderId: uuid("work_order_id").notNull(),
    userId: text("user_id").notNull(),
    kind: text().notNull(),
    payload: jsonb().notNull(),
    baseVersion: integer("base_version").notNull(),
    conflict: boolean().default(false).notNull(),
    published: boolean().default(false).notNull(),
    capturedAt: timestamp("captured_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workOrderId],
      foreignColumns: [workOrder.id],
      name: "field_event_work_order_id_fkey",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "field_event_user_id_fkey",
    }),
    check(
      "field_event_kind_check",
      sql`kind = ANY (ARRAY['note'::text, 'issue'::text, 'time'::text, 'checklist'::text, 'complete'::text])`,
    ),
  ],
);

export const serviceRequest = pgTable(
  "service_request",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    userId: text("user_id").notNull(),
    description: text().notNull(),
    status: text().default("new").notNull(),
    version: integer().default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "service_request_property_id_fkey",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "service_request_user_id_fkey",
    }),
  ],
);

export const serviceRequestEvent = pgTable(
  "service_request_event",
  {
    id: uuid().primaryKey().notNull(),
    serviceRequestId: uuid("service_request_id").notNull(),
    actorId: text("actor_id").notNull(),
    eventType: text("event_type").notNull(),
    priorVersion: integer("prior_version"),
    resultingVersion: integer("resulting_version").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    reason: text(),
    details: jsonb().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("service_request_event_request_created_idx").using("btree", table.serviceRequestId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsLast().op("timestamptz_ops")),
    foreignKey({ columns: [table.serviceRequestId], foreignColumns: [serviceRequest.id], name: "service_request_event_service_request_id_fkey" }),
    foreignKey({ columns: [table.actorId], foreignColumns: [user.id], name: "service_request_event_actor_id_fkey" }),
  ],
);

export const assessmentSlot = pgTable(
  "assessment_slot",
  {
    id: uuid().primaryKey().notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    propertyId: uuid("property_id"),
    bookedBy: text("booked_by"),
    managed: boolean().default(false).notNull(),
    cancelled: boolean().default(false).notNull(),
    bufferBefore: integer("buffer_before").default(0).notNull(),
    bufferAfter: integer("buffer_after").default(0).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "assessment_slot_property_id_fkey",
    }),
    foreignKey({
      columns: [table.bookedBy],
      foreignColumns: [user.id],
      name: "assessment_slot_booked_by_fkey",
    }),
    index("assessment_slot_available")
      .on(table.startsAt)
      .where(sql`${table.propertyId} IS NULL AND ${table.cancelled}=false`),
    unique("assessment_slot_starts_at_key").on(table.startsAt),
    check("assessment_slot_check", sql`ends_at > starts_at`),
  ],
);

export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid().primaryKey().notNull(),
    userId: text("user_id"),
    action: text().notNull(),
    entityId: text("entity_id"),
    details: jsonb().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "audit_event_user_id_fkey",
    }),
  ],
);

export const twoFactor = pgTable(
  "twoFactor",
  {
    id: text().primaryKey().notNull(),
    secret: text().notNull(),
    backupCodes: text().notNull(),
    userId: text().notNull(),
    verified: boolean().default(true),
    failedVerificationCount: integer().default(0).notNull(),
    lockedUntil: timestamp({ withTimezone: true, mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "twoFactor_userId_fkey",
    }).onDelete("cascade"),
  ],
);

export const propertyArea = pgTable(
  "property_area",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    name: text().notNull(),
    description: text().default("").notNull(),
    acreage: numeric(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "property_area_property_id_fkey",
    }),
    check("property_area_acreage_check", sql`acreage >= (0)::numeric`),
  ],
);

export const propertyAsset = pgTable(
  "property_asset",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    areaId: uuid("area_id"),
    name: text().notNull(),
    kind: text().notNull(),
    condition: text().default("not_assessed").notNull(),
    observedAt: timestamp("observed_at", {
      withTimezone: true,
      mode: "string",
    }),
    notes: text().default("").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "property_asset_property_id_fkey",
    }),
    foreignKey({
      columns: [table.areaId],
      foreignColumns: [propertyArea.id],
      name: "property_asset_area_id_fkey",
    }),
  ],
);

export const inspection = pgTable(
  "inspection",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    userId: text("user_id").notNull(),
    title: text().notNull(),
    findings: jsonb().notNull(),
    published: boolean().default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "inspection_property_id_fkey",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "inspection_user_id_fkey",
    }),
  ],
);

export const project = pgTable(
  "project",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    name: text().notNull(),
    scope: text().notNull(),
    status: text().default("planned").notNull(),
    phases: jsonb().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "project_property_id_fkey",
    }),
  ],
);

export const projectPhase = pgTable(
  "project_phase",
  {
    id: uuid().primaryKey().notNull(),
    projectId: uuid("project_id").notNull(),
    position: integer().notNull(),
    title: text().notNull(),
    scope: text().default("").notNull(),
    status: text().default("planned").notNull(),
    plannedStart: date("planned_start"),
    plannedEnd: date("planned_end"),
    actualStart: date("actual_start"),
    actualEnd: date("actual_end"),
    prerequisites: jsonb().default([]).notNull(),
    overrideReason: text("override_reason"),
    version: integer().default(1).notNull(),
    publishedSummary: text("published_summary"),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    publishedBy: text("published_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("project_phase_project_id_position_key").on(table.projectId, table.position),
    index("project_phase_project_position_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops"), table.position.asc().nullsLast().op("int4_ops")),
    index("project_phase_project_status_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("text_ops")),
    foreignKey({ columns: [table.projectId], foreignColumns: [project.id], name: "project_phase_project_id_fkey" }),
    foreignKey({ columns: [table.publishedBy], foreignColumns: [user.id], name: "project_phase_published_by_fkey" }),
  ],
);

export const projectPhaseEvent = pgTable(
  "project_phase_event",
  {
    id: uuid().primaryKey().notNull(),
    phaseId: uuid("phase_id").notNull(),
    actorId: text("actor_id").notNull(),
    eventType: text("event_type").notNull(),
    priorVersion: integer("prior_version"),
    resultingVersion: integer("resulting_version").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    reason: text(),
    details: jsonb().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("project_phase_event_phase_created_idx").using("btree", table.phaseId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsLast().op("timestamptz_ops")),
    foreignKey({ columns: [table.phaseId], foreignColumns: [projectPhase.id], name: "project_phase_event_phase_id_fkey" }),
    foreignKey({ columns: [table.actorId], foreignColumns: [user.id], name: "project_phase_event_actor_id_fkey" }),
  ],
);

export const workOrder = pgTable(
  "work_order",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    title: text().notNull(),
    scope: text().default("").notNull(),
    assignedTo: text("assigned_to"),
    scheduledAt: timestamp("scheduled_at", {
      withTimezone: true,
      mode: "string",
    }),
    status: text().default("draft").notNull(),
    version: integer().default(1).notNull(),
    checklist: jsonb().default([]).notNull(),
    prerequisites: jsonb().default([]).notNull(),
    overrideReason: text("override_reason"),
    published: boolean().default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    recurringServiceId: uuid("recurring_service_id"),
    occurrenceDate: date("occurrence_date"),
    projectId: uuid("project_id"),
    projectPhaseId: uuid("project_phase_id"),
  },
  (table) => [
    index("work_order_assigned_to_scheduled_at_idx").using(
      "btree",
      table.assignedTo.asc().nullsLast().op("text_ops"),
      table.scheduledAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    uniqueIndex("work_order_recurring_service_id_occurrence_date_idx").using(
      "btree",
      table.recurringServiceId.asc().nullsLast().op("date_ops"),
      table.occurrenceDate.asc().nullsLast().op("date_ops"),
    ),
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "work_order_property_id_fkey",
    }),
    foreignKey({
      columns: [table.assignedTo],
      foreignColumns: [user.id],
      name: "work_order_assigned_to_fkey",
    }),
    foreignKey({
      columns: [table.recurringServiceId],
      foreignColumns: [recurringService.id],
      name: "work_order_recurring_service_id_fkey",
    }),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
      name: "work_order_project_id_fkey",
    }),
    foreignKey({
      columns: [table.projectPhaseId],
      foreignColumns: [projectPhase.id],
      name: "work_order_project_phase_id_fkey",
    }),
    check(
      "work_order_status_check",
      sql`status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'reviewed'::text, 'cancelled'::text, 'skipped'::text, 'delayed'::text])`,
    ),
  ],
);

export const serviceRequestConversion = pgTable(
  "service_request_conversion",
  {
    operationId: uuid("operation_id").primaryKey().notNull(),
    serviceRequestId: uuid("service_request_id").notNull(),
    workOrderId: uuid("work_order_id").notNull(),
    actorId: text("actor_id").notNull(),
    expectedRequestVersion: integer("expected_request_version").notNull(),
    fingerprint: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("service_request_conversion_service_request_id_key").on(table.serviceRequestId),
    unique("service_request_conversion_work_order_id_key").on(table.workOrderId),
    index("service_request_conversion_request_created_idx").using("btree", table.serviceRequestId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsLast().op("timestamptz_ops")),
    foreignKey({ columns: [table.serviceRequestId], foreignColumns: [serviceRequest.id], name: "service_request_conversion_service_request_id_fkey" }),
    foreignKey({ columns: [table.workOrderId], foreignColumns: [workOrder.id], name: "service_request_conversion_work_order_id_fkey" }),
    foreignKey({ columns: [table.actorId], foreignColumns: [user.id], name: "service_request_conversion_actor_id_fkey" }),
  ],
);

export const externalInvoice = pgTable(
  "external_invoice",
  {
    id: text().primaryKey().notNull(),
    clientId: uuid("client_id").notNull(),
    documentNumber: text("document_number"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalCents: bigint("total_cents", { mode: "number" }).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    balanceCents: bigint("balance_cents", { mode: "number" }).notNull(),
    dueDate: date("due_date"),
    paymentUrl: text("payment_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    ownershipVerified: boolean("ownership_verified").default(false).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "external_invoice_client_id_fkey",
    }),
  ],
);

export const billingDraft = pgTable(
  "billing_draft",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    estimateId: uuid("estimate_id"),
    title: text().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    kind: text().notNull(),
    status: text().default("draft").notNull(),
    quickbooksId: text("quickbooks_id"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    balanceCents: bigint("balance_cents", { mode: "number" }),
    paymentUrl: text("payment_url"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    postingRequestId: uuid("posting_request_id"),
    postingPayload: jsonb("posting_payload"),
    ownershipVerified: boolean("ownership_verified").default(false).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "billing_draft_property_id_fkey",
    }),
    foreignKey({
      columns: [table.estimateId],
      foreignColumns: [estimate.id],
      name: "billing_draft_estimate_id_fkey",
    }),
    unique("billing_draft_quickbooks_id_key").on(table.quickbooksId),
    unique("billing_draft_posting_request_id_key").on(table.postingRequestId),
    check(
      "billing_draft_kind_check",
      sql`kind = ANY (ARRAY['service'::text, 'deposit'::text, 'progress'::text, 'final'::text])`,
    ),
    check("billing_draft_amount_cents_check", sql`amount_cents > 0`),
    check(
      "billing_draft_status_check",
      sql`status = ANY (ARRAY['draft'::text, 'approved'::text, 'posted'::text, 'failed'::text])`,
    ),
  ],
);

export const projectPhaseBillingIntent = pgTable(
  "project_phase_billing_intent",
  {
    operationId: uuid("operation_id").primaryKey().notNull(),
    phaseId: uuid("phase_id").notNull(),
    billingDraftId: uuid("billing_draft_id").notNull(),
    actorId: text("actor_id").notNull(),
    expectedPhaseVersion: integer("expected_phase_version").notNull(),
    fingerprint: text().notNull(),
    kind: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("project_phase_billing_intent_billing_draft_id_key").on(table.billingDraftId),
    index("project_phase_billing_intent_phase_created_idx").using("btree", table.phaseId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsLast().op("timestamptz_ops")),
    foreignKey({ columns: [table.phaseId], foreignColumns: [projectPhase.id], name: "project_phase_billing_intent_phase_id_fkey" }),
    foreignKey({ columns: [table.billingDraftId], foreignColumns: [billingDraft.id], name: "project_phase_billing_intent_billing_draft_id_fkey" }),
    foreignKey({ columns: [table.actorId], foreignColumns: [user.id], name: "project_phase_billing_intent_actor_id_fkey" }),
  ],
);

export const expense = pgTable(
  "expense",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    workOrderId: uuid("work_order_id"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    category: text().notNull(),
    description: text().notNull(),
    incurredOn: date("incurred_on").notNull(),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "expense_property_id_fkey",
    }),
    foreignKey({
      columns: [table.workOrderId],
      foreignColumns: [workOrder.id],
      name: "expense_work_order_id_fkey",
    }),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [user.id],
      name: "expense_created_by_fkey",
    }),
    check("expense_amount_cents_check", sql`amount_cents > 0`),
  ],
);

export const integrationConnection = pgTable("integration_connection", {
  provider: text().primaryKey().notNull(),
  realmId: text("realm_id").notNull(),
  credentialsEncrypted: text("credentials_encrypted").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

export const oauthState = pgTable(
  "oauth_state",
  {
    hash: text().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "oauth_state_user_id_fkey",
    }),
  ],
);

export const fileRecord = pgTable(
  "file_record",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    workOrderId: uuid("work_order_id"),
    userId: text("user_id").notNull(),
    objectKey: text("object_key").notNull(),
    name: text().notNull(),
    mime: text().notNull(),
    bytes: integer().notNull(),
    status: text().default("pending").notNull(),
    published: boolean().default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    classification: text().default("general").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "file_record_property_id_fkey",
    }),
    foreignKey({
      columns: [table.workOrderId],
      foreignColumns: [workOrder.id],
      name: "file_record_work_order_id_fkey",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "file_record_user_id_fkey",
    }),
    unique("file_record_object_key_key").on(table.objectKey),
    check("file_record_bytes_check", sql`bytes > 0`),
  ],
);

export const quickbooksImportPreview = pgTable(
  "quickbooks_import_preview",
  {
    id: uuid().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    payload: jsonb().notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "quickbooks_import_preview_user_id_fkey",
    }),
  ],
);

export const notification = pgTable(
  "notification",
  {
    id: uuid().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    title: text().notNull(),
    body: text().notNull(),
    readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "notification_user_id_fkey",
    }),
  ],
);

export const smsConsent = pgTable(
  "sms_consent",
  {
    userId: text("user_id").primaryKey().notNull(),
    phone: text().notNull(),
    optedIn: boolean("opted_in").notNull(),
    consentText: text("consent_text").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "sms_consent_user_id_fkey",
    }),
    unique("sms_consent_phone_key").on(table.phone),
  ],
);

export const outbox = pgTable(
  "outbox",
  {
    id: uuid().primaryKey().notNull(),
    kind: text().notNull(),
    payload: jsonb().notNull(),
    status: text().default("pending").notNull(),
    attempts: integer().default(0).notNull(),
    availableAt: timestamp("available_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true, mode: "string" }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    providerMessageId: text("provider_message_id"),
    dedupKey: text("dedup_key"),
  },
  (table) => [
    index("outbox_status_available_at_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops"),
      table.availableAt.asc().nullsLast().op("text_ops"),
    ),
    unique("outbox_dedup_key_key").on(table.dedupKey),
  ],
);

export const lead = pgTable(
  "lead",
  {
    id: uuid().primaryKey().notNull(),
    name: text().notNull(),
    email: text(),
    phone: text(),
    location: text().notNull(),
    description: text().notNull(),
    source: text(),
    status: text().default("new").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    inquiryType: text("inquiry_type"),
    reportedCompanyName: text("reported_company_name"),
    contactTitle: text("contact_title"),
    reportedPropertyName: text("reported_property_name"),
    propertyType: text("property_type"),
    acreageDescription: text("acreage_description"),
    projectStage: text("project_stage"),
    serviceTiming: text("service_timing"),
    services: text()
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    attribution: jsonb().default({}).notNull(),
    ownerId: text("owner_id").references(() => user.id),
    nextAction: text("next_action"),
    nextActionDueAt: timestamp("next_action_due_at", {
      withTimezone: true,
      mode: "string",
    }),
    lastActivityAt: timestamp("last_activity_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    version: integer().default(1).notNull(),
    organizationId: uuid("organization_id").references(
      () => businessOrganization.id,
    ),
    contactId: uuid("contact_id").references(() => contact.id),
    propertyId: uuid("property_id").references(() => property.id),
    convertedClientId: uuid("converted_client_id"),
    convertedPropertyId: uuid("converted_property_id"),
  },
  (table) => [
    index("lead_commercial_followup").on(
      table.inquiryType,
      table.ownerId,
      table.nextActionDueAt,
    ),
    check(
      "lead_commercial_channel",
      sql`inquiry_type IS DISTINCT FROM 'commercial_site_assessment' OR (NULLIF(btrim(email),'') IS NOT NULL OR NULLIF(btrim(phone),'') IS NOT NULL)`,
    ),
    foreignKey({
      columns: [table.convertedClientId],
      foreignColumns: [client.id],
      name: "lead_converted_client_id_fkey",
    }),
    foreignKey({
      columns: [table.convertedPropertyId],
      foreignColumns: [property.id],
      name: "lead_converted_property_id_fkey",
    }),
  ],
);

export const estimate = pgTable(
  "estimate",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    title: text().notNull(),
    revision: integer().default(1).notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    scope: text().notNull(),
    status: text().default("draft").notNull(),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    seriesId: uuid("series_id").defaultRandom().notNull(),
    isCurrent: boolean("is_current").default(true).notNull(),
    changeOrderFor: uuid("change_order_for"),
  },
  (table) => [
    uniqueIndex("estimate_series_id_idx")
      .using("btree", table.seriesId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(is_current = true)`),
    uniqueIndex("estimate_series_id_revision_idx").using(
      "btree",
      table.seriesId.asc().nullsLast().op("int4_ops"),
      table.revision.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "estimate_property_id_fkey",
    }),
    foreignKey({
      columns: [table.approvedBy],
      foreignColumns: [user.id],
      name: "estimate_approved_by_fkey",
    }),
    foreignKey({
      columns: [table.changeOrderFor],
      foreignColumns: [table.id],
      name: "estimate_change_order_for_fkey",
    }),
    check("estimate_amount_cents_check", sql`amount_cents >= 0`),
    check(
      "estimate_status_check",
      sql`status = ANY (ARRAY['draft'::text, 'sent'::text, 'approved'::text, 'declined'::text])`,
    ),
  ],
);

export const recurringService = pgTable(
  "recurring_service",
  {
    id: uuid().primaryKey().notNull(),
    propertyId: uuid("property_id").notNull(),
    title: text().notNull(),
    scope: text().default("").notNull(),
    cadence: text().notNull(),
    intervalCount: integer("interval_count").notNull(),
    nextDate: date("next_date").notNull(),
    localTime: text("local_time").default("08:00").notNull(),
    assignedTo: text("assigned_to"),
    billingMode: text("billing_mode").notNull(),
    paused: boolean().default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    anchorDay: integer("anchor_day"),
  },
  (table) => [
    foreignKey({
      columns: [table.propertyId],
      foreignColumns: [property.id],
      name: "recurring_service_property_id_fkey",
    }),
    foreignKey({
      columns: [table.assignedTo],
      foreignColumns: [user.id],
      name: "recurring_service_assigned_to_fkey",
    }),
    check(
      "recurring_service_cadence_check",
      sql`cadence = ANY (ARRAY['weekly'::text, 'monthly'::text])`,
    ),
    check(
      "recurring_service_interval_count_check",
      sql`(interval_count >= 1) AND (interval_count <= 52)`,
    ),
    check(
      "recurring_service_billing_mode_check",
      sql`billing_mode = ANY (ARRAY['fixed_monthly'::text, 'per_visit'::text])`,
    ),
  ],
);

export const sessionAssurance = pgTable(
  "session_assurance",
  {
    sessionId: text("session_id").primaryKey().notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [session.id],
      name: "session_assurance_session_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const billingOperation = pgTable(
  "billing_operation",
  {
    id: uuid().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    fingerprint: text().notNull(),
    draftId: uuid("draft_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "billing_operation_user_id_fkey",
    }),
    foreignKey({
      columns: [table.draftId],
      foreignColumns: [billingDraft.id],
      name: "billing_operation_draft_id_fkey",
    }),
  ],
);

export const clientAccess = pgTable(
  "client_access",
  {
    userId: text("user_id").notNull(),
    clientId: uuid("client_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "client_access_user_id_fkey",
    }),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [client.id],
      name: "client_access_client_id_fkey",
    }),
    primaryKey({
      columns: [table.userId, table.clientId],
      name: "client_access_pkey",
    }),
  ],
);

export const assessmentAvailability = pgTable(
  "assessment_availability",
  {
    id: boolean().primaryKey().default(true).notNull(),
    version: integer().default(1).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferBefore: integer("buffer_before").notNull(),
    bufferAfter: integer("buffer_after").notNull(),
    windows: jsonb().default([]).notNull(),
  },
  (table) => [
    check("assessment_availability_id_check", sql`${table.id}`),
    check(
      "assessment_availability_duration_minutes_check",
      sql`${table.durationMinutes} BETWEEN 15 AND 240`,
    ),
    check(
      "assessment_availability_buffer_before_check",
      sql`${table.bufferBefore} BETWEEN 0 AND 120`,
    ),
    check(
      "assessment_availability_buffer_after_check",
      sql`${table.bufferAfter} BETWEEN 0 AND 120`,
    ),
  ],
);
export const assessmentBlackout = pgTable(
  "assessment_blackout",
  {
    id: uuid().primaryKey().notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    reason: text().notNull(),
    archived: boolean().default(false).notNull(),
  },
  (table) => [
    check("assessment_blackout_check", sql`${table.endsAt}>${table.startsAt}`),
  ],
);

export const integrationIngressKey = pgTable("integration_ingress_key", {
  keyId: text("key_id").primaryKey(),
  sourceInstanceId: uuid("source_instance_id").notNull(),
  enabled: boolean().default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
});
export const commercialIntakeReceipt = pgTable(
  "commercial_intake_receipt",
  {
    id: uuid().primaryKey(),
    sourceInstanceId: uuid("source_instance_id").notNull(),
    submissionId: uuid("submission_id").notNull(),
    eventId: uuid("event_id").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    payloadSha256: text("payload_sha256").notNull(),
    acceptedAt: timestamp("accepted_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    leadId: uuid("lead_id")
      .notNull()
      .unique()
      .references(() => lead.id),
    rawIntake: jsonb("raw_intake").notNull(),
  },
  (table) => [
    unique().on(table.sourceInstanceId, table.eventId),
    unique().on(table.sourceInstanceId, table.submissionId),
    check(
      "commercial_intake_receipt_schema_version_check",
      sql`schema_version=1`,
    ),
    check(
      "commercial_intake_receipt_payload_sha256_check",
      sql`length(payload_sha256)=64`,
    ),
  ],
);

export const businessOrganization = pgTable("business_organization", {
  id: uuid().primaryKey(),
  displayName: text("display_name").notNull(),
  legalName: text("legal_name"),
  clientId: uuid("client_id")
    .unique()
    .references(() => client.id),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id),
  archived: boolean().default(false).notNull(),
  version: integer().default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});
export const organizationContact = pgTable(
  "organization_contact",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => businessOrganization.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contact.id),
    role: text().notNull(),
    title: text(),
    source: text().notNull(),
    version: integer().default(1).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.contactId, t.role] }),
    index("organization_contact_contact").on(t.contactId),
    check(
      "organization_contact_role_check",
      sql`role IN ('requester','site_manager','facilities','procurement','owner_representative','other')`,
    ),
  ],
);
export const propertyOrganization = pgTable(
  "property_organization",
  {
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => businessOrganization.id),
    role: text().notNull(),
    source: text().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.propertyId, t.organizationId, t.role] }),
    index("property_organization_organization").on(t.organizationId),
    check(
      "property_organization_role_check",
      sql`role IN ('reported_owner','operator','manager','developer','prospective_customer','other')`,
    ),
  ],
);
export const commercialContextOperation = pgTable(
  "commercial_context_operation",
  {
    id: uuid().primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => lead.id),
    fingerprint: text().notNull(),
    result: jsonb().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "commercial_context_operation_fingerprint_check",
      sql`length(fingerprint)=64`,
    ),
  ],
);

// Mirror of reviewed migration 0012; SQL migrations remain authoritative.
export const serviceAgreement = pgTable(
  "service_agreement",
  {
    id: uuid().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => property.id),
    recurringServiceId: uuid("recurring_service_id")
      .notNull()
      .references(() => recurringService.id),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => estimate.id),
    predecessorId: uuid("predecessor_id")
      .unique()
      .references((): AnyPgColumn => serviceAgreement.id),
    title: text().notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    billingMode: text("billing_mode").notNull(),
    unitAmountCents: bigint("unit_amount_cents", { mode: "number" }),
    scopeSnapshot: text("scope_snapshot").notNull(),
    estimateRevision: integer("estimate_revision").notNull(),
    status: text().default("draft").notNull(),
    version: integer().default(1).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    creationFingerprint: text("creation_fingerprint").notNull(),
    activatedBy: text("activated_by").references(() => user.id),
    activatedOn: date("activated_on"),
    activatedAt: timestamp("activated_at", {
      withTimezone: true,
      mode: "string",
    }),
    cancellationEffectiveOn: date("cancellation_effective_on"),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("service_agreement_recurrence_term").on(
      t.recurringServiceId,
      t.startsOn,
      t.endsOn,
    ),
    index("service_agreement_scan_order").on(t.createdAt, t.id),
    check(
      "service_agreement_title_check",
      sql`length(btrim(title)) BETWEEN 1 AND 500`,
    ),
    check("service_agreement_check", sql`ends_on>=starts_on`),
    check(
      "service_agreement_billing_mode_check",
      sql`billing_mode IN ('fixed_monthly','per_visit')`,
    ),
    check(
      "service_agreement_estimate_revision_check",
      sql`estimate_revision>0`,
    ),
    check(
      "service_agreement_status_check",
      sql`status IN ('draft','active','cancelled')`,
    ),
    check("service_agreement_version_check", sql`version>0`),
    check(
      "service_agreement_creation_fingerprint_check",
      sql`length(creation_fingerprint)=64`,
    ),
    check(
      "service_agreement_check1",
      sql`(billing_mode='per_visit' AND unit_amount_cents IS NOT NULL AND unit_amount_cents BETWEEN 1 AND 10000000000) OR (billing_mode='fixed_monthly' AND unit_amount_cents IS NULL)`,
    ),
    check(
      "service_agreement_check2",
      sql`(status='draft' AND activated_at IS NULL AND activated_on IS NULL AND activated_by IS NULL) OR (status IN ('active','cancelled') AND activated_at IS NOT NULL AND activated_on IS NOT NULL AND activated_by IS NOT NULL)`,
    ),
    check(
      "service_agreement_check3",
      sql`(status='cancelled' AND cancellation_effective_on IS NOT NULL AND cancellation_reason IS NOT NULL AND length(btrim(cancellation_reason)) BETWEEN 1 AND 1000) OR (status<>'cancelled' AND cancellation_effective_on IS NULL AND cancellation_reason IS NULL)`,
    ),
  ],
);
export const fixedChargePeriod = pgTable(
  "fixed_charge_period",
  {
    id: uuid().primaryKey(),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => serviceAgreement.id),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    active: boolean().default(true).notNull(),
  },
  (t) => [
    unique().on(t.agreementId, t.startsOn),
    unique().on(t.id, t.agreementId),
    check("fixed_charge_period_check", sql`ends_on>=starts_on`),
    check(
      "fixed_charge_period_amount_cents_check",
      sql`amount_cents BETWEEN 1 AND 10000000000`,
    ),
  ],
);
export const agreementCharge = pgTable(
  "agreement_charge",
  {
    id: uuid().primaryKey(),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => serviceAgreement.id),
    sourceKey: text("source_key").notNull(),
    fixedPeriodId: uuid("fixed_period_id").unique(),
    workOrderId: uuid("work_order_id").references(() => workOrder.id),
    billingDraftId: uuid("billing_draft_id")
      .notNull()
      .unique()
      .references(() => billingDraft.id),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    preparedBy: text("prepared_by").references(() => user.id),
    preparedJobId: uuid("prepared_job_id").references(() => outbox.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique().on(t.agreementId, t.sourceKey),
    unique().on(t.agreementId, t.workOrderId),
    foreignKey({
      columns: [t.fixedPeriodId, t.agreementId],
      foreignColumns: [fixedChargePeriod.id, fixedChargePeriod.agreementId],
    }),
    index("agreement_charge_history").on(
      t.agreementId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    uniqueIndex("agreement_charge_work_once")
      .on(t.workOrderId)
      .where(sql`work_order_id IS NOT NULL`),
    uniqueIndex("agreement_charge_job_once")
      .on(t.preparedJobId)
      .where(sql`prepared_job_id IS NOT NULL`),
    check(
      "agreement_charge_amount_cents_check",
      sql`amount_cents BETWEEN 1 AND 10000000000`,
    ),
    check(
      "agreement_charge_check",
      sql`(fixed_period_id IS NOT NULL AND work_order_id IS NULL AND source_key LIKE 'period:%') OR (fixed_period_id IS NULL AND work_order_id IS NOT NULL AND source_key='work:'||work_order_id::text)`,
    ),
    check(
      "agreement_charge_preparation_actor",
      sql`prepared_by IS NULL OR prepared_job_id IS NULL`,
    ),
  ],
);

// Mirror of reviewed migration 0014; SQL migrations remain authoritative.
export const coreFederationAuthorizationCode = pgTable(
  "core_federation_authorization_code",
  {
    id: uuid().primaryKey().notNull(),
    codeHash: text("code_hash").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    clientId: text("client_id").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    canonicalUserId: text("canonical_user_id").notNull(),
    // Deliberately no foreign key: session deletion must revoke a grant while
    // preserving its lifecycle record until the short retention window ends.
    canonicalSessionId: text("canonical_session_id").notNull(),
    ownerAttested: boolean("owner_attested").default(false).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("core_federation_authorization_code_code_hash_key").on(t.codeHash),
    index("core_federation_authorization_code_expiry_idx").on(t.expiresAt),
    foreignKey({
      columns: [t.canonicalUserId],
      foreignColumns: [user.id],
      name: "core_federation_authorization_code_canonical_user_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const coreFederationBrowserRequest = pgTable(
  "core_federation_browser_request",
  {
    id: uuid().primaryKey().notNull(),
    nonceHash: text("nonce_hash").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    clientId: text("client_id").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    state: text().notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("core_federation_browser_request_nonce_hash_key").on(t.nonceHash),
    index("core_federation_browser_request_expiry_idx").on(t.expiresAt),
  ],
);

export const coreFederationGrant = pgTable(
  "core_federation_grant",
  {
    id: uuid().primaryKey().notNull(),
    canonicalUserId: text("canonical_user_id").notNull(),
    canonicalSessionId: text("canonical_session_id").notNull(),
    ownerAttested: boolean("owner_attested").default(false).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("core_federation_grant_expiry_idx").on(t.expiresAt),
    foreignKey({
      columns: [t.canonicalUserId],
      foreignColumns: [user.id],
      name: "core_federation_grant_canonical_user_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const agreementChargeReviewEvent = pgTable(
  "agreement_charge_review_event",
  {
    id: uuid().primaryKey(),
    chargeId: uuid("charge_id")
      .notNull()
      .references(() => agreementCharge.id),
    reviewVersion: integer("review_version").notNull(),
    outcome: text().notNull(),
    cancellationVersion: integer("cancellation_version").notNull(),
    snapshot: jsonb().notNull(),
    snapshotSha256: text("snapshot_sha256").notNull(),
    requestSha256: text("request_sha256").notNull(),
    reason: text().notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique().on(table.chargeId, table.reviewVersion),
    check(
      "agreement_charge_review_event_review_version_check",
      sql`review_version>0`,
    ),
    check(
      "agreement_charge_review_event_outcome_check",
      sql`outcome IN ('keep_due','correction_required')`,
    ),
    check(
      "agreement_charge_review_event_cancellation_version_check",
      sql`cancellation_version>0`,
    ),
    check(
      "agreement_charge_review_event_snapshot_check",
      sql`jsonb_typeof(snapshot)='object'`,
    ),
    check(
      "agreement_charge_review_event_snapshot_sha256_check",
      sql`snapshot_sha256 ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "agreement_charge_review_event_request_sha256_check",
      sql`request_sha256 ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "agreement_charge_review_event_reason_check",
      sql`length(btrim(reason)) BETWEEN 1 AND 2000`,
    ),
  ],
);
