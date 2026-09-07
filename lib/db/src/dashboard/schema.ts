// Generated from dashboard SQL migrations 0001–0008; empty-string defaults corrected after introspection.
import {
  pgTable,
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
    clientId: uuid("client_id").notNull(),
    name: text().notNull(),
    email: text(),
    phone: text(),
    kind: text().default("site").notNull(),
    archived: boolean().default(false).notNull(),
    version: integer().default(1).notNull(),
  },
  (table) => [
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
    clientId: uuid("client_id").notNull(),
    name: text().notNull(),
    address: text().notNull(),
    acreage: numeric(),
    accessInstructions: text("access_instructions").default("").notNull(),
    notes: text().default("").notNull(),
    archived: boolean().default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
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
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
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
    check(
      "work_order_status_check",
      sql`status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'reviewed'::text, 'cancelled'::text, 'skipped'::text, 'delayed'::text])`,
    ),
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
    email: text().notNull(),
    phone: text(),
    location: text().notNull(),
    description: text().notNull(),
    source: text(),
    status: text().default("new").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    convertedClientId: uuid("converted_client_id"),
    convertedPropertyId: uuid("converted_property_id"),
  },
  (table) => [
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
