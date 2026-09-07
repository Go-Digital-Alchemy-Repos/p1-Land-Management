import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { cmsFormSubmissions } from "./forms";
import { users } from "./users";

export const CRM_LEAD_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;
export type CrmLeadStage = (typeof CRM_LEAD_STAGES)[number];

export const CRM_LEAD_STAGE_LABELS: Record<CrmLeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const CRM_CLIENT_STATUSES = ["onboarding", "active", "inactive"] as const;
export type CrmClientStatus = (typeof CRM_CLIENT_STATUSES)[number];

export const CRM_CLIENT_STATUS_LABELS: Record<CrmClientStatus, string> = {
  onboarding: "Onboarding",
  active: "Active",
  inactive: "Inactive",
};

export const CRM_CLIENT_TYPES = ["individual", "business"] as const;
export type CrmClientType = (typeof CRM_CLIENT_TYPES)[number];

export const CRM_CLIENT_TYPE_LABELS: Record<CrmClientType, string> = {
  individual: "Individual",
  business: "Business",
};

export const CRM_CONTACT_METHODS = ["email", "phone", "text", "no_preference"] as const;
export type CrmContactMethod = (typeof CRM_CONTACT_METHODS)[number];

export const CRM_CONTACT_METHOD_LABELS: Record<CrmContactMethod, string> = {
  email: "Email",
  phone: "Phone",
  text: "Text",
  no_preference: "No Preference",
};

export const CRM_CLIENT_ONBOARDING_STATUSES = ["not_started", "in_progress", "complete"] as const;
export type CrmClientOnboardingStatus = (typeof CRM_CLIENT_ONBOARDING_STATUSES)[number];

export const CRM_CLIENT_ONBOARDING_STATUS_LABELS: Record<CrmClientOnboardingStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  complete: "Complete",
};

export const crmLeads = pgTable(
  "crm_leads",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    message: text("message"),
    stage: text("stage").$type<CrmLeadStage>().notNull().default("new"),
    source: text("source").notNull().default("manual"),
    externalId: text("external_id"),
    formSubmissionId: varchar("form_submission_id").references(() => cmsFormSubmissions.id, {
      onDelete: "set null",
    }),
    formData: jsonb("form_data")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
    nextFollowUpAt: timestamp("next_follow_up_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_crm_leads_stage").on(table.stage),
    index("idx_crm_leads_email").on(table.email),
    index("idx_crm_leads_phone").on(table.phone),
    index("idx_crm_leads_source").on(table.source),
    index("idx_crm_leads_created_at").on(table.createdAt),
    index("idx_crm_leads_owner").on(table.ownerId),
  ],
);

export const crmClients = pgTable(
  "crm_clients",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sourceLeadId: varchar("source_lead_id")
      .references(() => crmLeads.id, { onDelete: "set null" })
      .unique(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    clientType: text("client_type").$type<CrmClientType>().notNull().default("individual"),
    primaryEmail: text("primary_email"),
    secondaryEmail: text("secondary_email"),
    primaryPhone: text("primary_phone"),
    alternatePhone: text("alternate_phone"),
    preferredContactMethod: text("preferred_contact_method")
      .$type<CrmContactMethod>()
      .notNull()
      .default("no_preference"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country"),
    companyName: text("company_name"),
    legalName: text("legal_name"),
    website: text("website"),
    industry: text("industry"),
    companySize: text("company_size"),
    businessType: text("business_type"),
    companyPhone: text("company_phone"),
    companyEmail: text("company_email"),
    billingContactName: text("billing_contact_name"),
    billingEmail: text("billing_email"),
    billingPhone: text("billing_phone"),
    accountOwnerId: varchar("account_owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    onboardingStatus: text("onboarding_status")
      .$type<CrmClientOnboardingStatus>()
      .notNull()
      .default("not_started"),
    serviceStartDate: timestamp("service_start_date"),
    renewalDate: timestamp("renewal_date"),
    clientSince: timestamp("client_since"),
    internalTags: jsonb("internal_tags")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    status: text("status").$type<CrmClientStatus>().notNull().default("onboarding"),
    source: text("source").notNull().default("manual"),
    formData: jsonb("form_data")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    ownerId: varchar("owner_id").references(() => users.id, { onDelete: "set null" }),
    nextFollowUpAt: timestamp("next_follow_up_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_crm_clients_source_lead").on(table.sourceLeadId),
    index("idx_crm_clients_status").on(table.status),
    index("idx_crm_clients_email").on(table.email),
    index("idx_crm_clients_phone").on(table.phone),
    index("idx_crm_clients_client_type").on(table.clientType),
    index("idx_crm_clients_company_name").on(table.companyName),
    index("idx_crm_clients_account_owner").on(table.accountOwnerId),
    index("idx_crm_clients_owner").on(table.ownerId),
    index("idx_crm_clients_created_at").on(table.createdAt),
  ],
);

export const crmClientNotes = pgTable(
  "crm_client_notes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: varchar("client_id")
      .references(() => crmClients.id, { onDelete: "cascade" })
      .notNull(),
    body: text("body").notNull(),
    createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_crm_client_notes_client_id").on(table.clientId),
    index("idx_crm_client_notes_created_at").on(table.createdAt),
  ],
);

export const crmClientTasks = pgTable(
  "crm_client_tasks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: varchar("client_id")
      .references(() => crmClients.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    dueAt: timestamp("due_at"),
    completed: boolean("completed").notNull().default(false),
    assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
    createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_crm_client_tasks_client_id").on(table.clientId),
    index("idx_crm_client_tasks_due_at").on(table.dueAt),
    index("idx_crm_client_tasks_completed").on(table.completed),
  ],
);

export const crmLeadNotes = pgTable(
  "crm_lead_notes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    leadId: varchar("lead_id")
      .references(() => crmLeads.id, { onDelete: "cascade" })
      .notNull(),
    body: text("body").notNull(),
    createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_crm_lead_notes_lead_id").on(table.leadId),
    index("idx_crm_lead_notes_created_at").on(table.createdAt),
  ],
);

export const crmLeadTasks = pgTable(
  "crm_lead_tasks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    leadId: varchar("lead_id")
      .references(() => crmLeads.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    dueAt: timestamp("due_at"),
    completed: boolean("completed").notNull().default(false),
    assignedToId: varchar("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
    createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_crm_lead_tasks_lead_id").on(table.leadId),
    index("idx_crm_lead_tasks_due_at").on(table.dueAt),
    index("idx_crm_lead_tasks_completed").on(table.completed),
  ],
);

export const crmLeadInputSchema = z.object({
  name: z.string().trim().min(1, "Lead name is required"),
  email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  phone: z.string().trim().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  message: z.string().trim().optional().nullable(),
  stage: z.enum(CRM_LEAD_STAGES).optional().default("new"),
  source: z.string().trim().min(1).optional().default("manual"),
  externalId: z.string().trim().optional().nullable(),
  ownerId: z.string().trim().optional().nullable(),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
  formSubmissionId: z.string().trim().optional().nullable(),
  formData: z.record(z.unknown()).optional().default({}),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const insertCrmLeadSchema = createInsertSchema(crmLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCrmLeadNoteSchema = createInsertSchema(crmLeadNotes).omit({
  id: true,
  createdAt: true,
});
export const insertCrmLeadTaskSchema = createInsertSchema(crmLeadTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCrmClientSchema = createInsertSchema(crmClients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCrmClientNoteSchema = createInsertSchema(crmClientNotes).omit({
  id: true,
  createdAt: true,
});
export const insertCrmClientTaskSchema = createInsertSchema(crmClientTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const crmClientUpdateSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").optional(),
  email: z.string().trim().email().optional().or(z.literal("")).nullable(),
  phone: z.string().trim().optional().nullable(),
  company: z.string().trim().optional().nullable(),
  clientType: z.enum(CRM_CLIENT_TYPES).optional(),
  primaryEmail: z.string().trim().email().optional().or(z.literal("")).nullable(),
  secondaryEmail: z.string().trim().email().optional().or(z.literal("")).nullable(),
  primaryPhone: z.string().trim().optional().nullable(),
  alternatePhone: z.string().trim().optional().nullable(),
  preferredContactMethod: z.enum(CRM_CONTACT_METHODS).optional(),
  addressLine1: z.string().trim().optional().nullable(),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  region: z.string().trim().optional().nullable(),
  postalCode: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  companyName: z.string().trim().optional().nullable(),
  legalName: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  industry: z.string().trim().optional().nullable(),
  companySize: z.string().trim().optional().nullable(),
  businessType: z.string().trim().optional().nullable(),
  companyPhone: z.string().trim().optional().nullable(),
  companyEmail: z.string().trim().email().optional().or(z.literal("")).nullable(),
  billingContactName: z.string().trim().optional().nullable(),
  billingEmail: z.string().trim().email().optional().or(z.literal("")).nullable(),
  billingPhone: z.string().trim().optional().nullable(),
  accountOwnerId: z.string().trim().optional().nullable(),
  onboardingStatus: z.enum(CRM_CLIENT_ONBOARDING_STATUSES).optional(),
  serviceStartDate: z.coerce.date().optional().nullable(),
  renewalDate: z.coerce.date().optional().nullable(),
  clientSince: z.coerce.date().optional().nullable(),
  internalTags: z.array(z.string().trim().min(1)).optional(),
  status: z.enum(CRM_CLIENT_STATUSES).optional(),
  ownerId: z.string().trim().optional().nullable(),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
  formData: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertCrmLead = typeof crmLeads.$inferInsert;
export type CrmLeadNote = typeof crmLeadNotes.$inferSelect;
export type InsertCrmLeadNote = typeof crmLeadNotes.$inferInsert;
export type CrmLeadTask = typeof crmLeadTasks.$inferSelect;
export type InsertCrmLeadTask = typeof crmLeadTasks.$inferInsert;
export type CrmLeadInput = z.infer<typeof crmLeadInputSchema>;
export type CrmClient = typeof crmClients.$inferSelect;
export type InsertCrmClient = typeof crmClients.$inferInsert;
export type CrmClientNote = typeof crmClientNotes.$inferSelect;
export type InsertCrmClientNote = typeof crmClientNotes.$inferInsert;
export type CrmClientTask = typeof crmClientTasks.$inferSelect;
export type InsertCrmClientTask = typeof crmClientTasks.$inferInsert;
export type CrmClientUpdate = z.infer<typeof crmClientUpdateSchema>;
