import { sql } from "drizzle-orm";
import {
  pgTable,
  integer,
  text,
  varchar,
  timestamp,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const CMS_FORM_KINDS = [
  "contact",
  "newsletter",
  "interest",
  "application",
  "custom",
] as const;
export type CmsFormKind = (typeof CMS_FORM_KINDS)[number];

export const CMS_FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "tel",
  "website",
  "number",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "hidden",
  "html",
  "section",
  "page",
  "image-choice",
  "name",
  "date",
  "time",
  "address",
  "consent",
  "list",
] as const;
export type CmsFormFieldType = (typeof CMS_FORM_FIELD_TYPES)[number];

export const cmsFormFieldOptionSchema = z.object({
  label: z.string().min(1, "Option label is required"),
  value: z.string().min(1, "Option value is required"),
  imageUrl: z.string().optional().default(""),
});

export type CmsFormFieldOption = z.infer<typeof cmsFormFieldOptionSchema>;

export const cmsFormListColumnSchema = z.object({
  id: z.string().min(1, "Column id is required"),
  label: z.string().min(1, "Column label is required"),
  placeholder: z.string().optional().default(""),
});

export type CmsFormListColumn = z.infer<typeof cmsFormListColumnSchema>;

export const cmsFormFieldConfigSchema = z
  .object({
    nameFormat: z.enum(["full", "split"]).optional().default("full"),
    sectionTitle: z.string().optional().default(""),
    sectionSubtitle: z.string().optional().default(""),
    showDivider: z.boolean().optional().default(true),
    dividerColor: z.string().optional().default("#e2e8f0"),
    htmlContent: z.string().optional().default(""),
    pageTitle: z.string().optional().default(""),
    pageDescription: z.string().optional().default(""),
    nextButtonText: z.string().optional().default("Next"),
    previousButtonText: z.string().optional().default("Previous"),
    choiceLayout: z.enum(["stacked", "inline", "grid"]).optional().default("stacked"),
    selectionMode: z.enum(["single", "multiple"]).optional().default("single"),
    consentCheckboxLabel: z.string().optional().default("I agree"),
    consentDescription: z.string().optional().default(""),
    defaultValue: z.union([z.string(), z.boolean()]).optional(),
    timeFormat: z.enum(["12", "24"]).optional().default("12"),
    showStreet2: z.boolean().optional().default(false),
    showCountry: z.boolean().optional().default(true),
    addressLayout: z.enum(["stacked", "compact"]).optional().default("stacked"),
    listColumns: z.array(cmsFormListColumnSchema).optional().default([]),
    maxRows: z.number().optional().default(10),
  })
  .passthrough();

export type CmsFormFieldConfig = z.infer<typeof cmsFormFieldConfigSchema>;

export const cmsFormFieldSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(CMS_FORM_FIELD_TYPES),
  placeholder: z.string().optional().default(""),
  helpText: z.string().optional().default(""),
  required: z.boolean().optional().default(false),
  width: z.enum(["full", "half"]).optional().default("full"),
  options: z.array(cmsFormFieldOptionSchema).optional().default([]),
  config: cmsFormFieldConfigSchema.optional().default({}),
});

export type CmsFormField = z.infer<typeof cmsFormFieldSchema>;

export const cmsFormSettingsSchema = z.object({
  submitButtonText: z.string().optional().default("Submit"),
  successMessage: z.string().optional().default("Thanks! Your submission has been received."),
  mailchimpEnabled: z.boolean().optional().default(false),
  mailchimpTag: z.string().optional().default(""),
  notifyAdmins: z.boolean().optional().default(false),
  storeAsContactMessage: z.boolean().optional().default(false),
  createCrmLead: z.boolean().optional().default(false),
});

export type CmsFormSettings = z.infer<typeof cmsFormSettingsSchema>;

export const cmsForms = pgTable(
  "cms_forms",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    kind: text("kind").$type<CmsFormKind>().default("custom").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    fields: jsonb("fields")
      .$type<CmsFormField[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    settings: jsonb("settings")
      .$type<CmsFormSettings>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_cms_forms_slug_unique").on(table.slug),
    index("idx_cms_forms_kind").on(table.kind),
    index("idx_cms_forms_updated_at").on(table.updatedAt),
  ],
);

export const cmsFormSubmissions = pgTable(
  "cms_form_submissions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    formId: varchar("form_id")
      .references(() => cmsForms.id, { onDelete: "cascade" })
      .notNull(),
    data: jsonb("data")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    source: text("source"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_cms_form_submissions_form_id").on(table.formId),
    index("idx_cms_form_submissions_created_at").on(table.createdAt),
    uniqueIndex("idx_cms_form_submissions_form_idempotency_key").on(
      table.formId,
      table.idempotencyKey,
    ),
  ],
);

export const insertCmsFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional().nullable(),
  kind: z.enum(CMS_FORM_KINDS).default("custom"),
  isSystem: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  fields: z.array(cmsFormFieldSchema).default([]),
  settings: cmsFormSettingsSchema.default({}),
});

export const insertCmsFormSubmissionSchema = z.object({
  formId: z.string().min(1),
  data: z.record(z.unknown()).default({}),
  source: z.string().optional().nullable(),
  idempotencyKey: z.string().min(1).max(128).optional().nullable(),
});

export type InsertCmsForm = z.infer<typeof insertCmsFormSchema>;
export type CmsForm = typeof cmsForms.$inferSelect;
export type InsertCmsFormSubmission = z.infer<typeof insertCmsFormSubmissionSchema>;
export type CmsFormSubmission = typeof cmsFormSubmissions.$inferSelect;

export type CmsFormEffectPayload =
  | { kind: "crm_intake"; formName: string }
  | { kind: "contact_message" }
  | { kind: "mailchimp_sync"; email: string; firstName: string; lastName: string; tag: string }
  | {
      kind: "admin_notification";
      recipient: string;
      formName: string;
      summary: string;
      dashboardUrl: string;
      contact: { name: string; email: string; message: string } | null;
    };

export const cmsFormEffectJobs = pgTable(
  "cms_form_effect_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    submissionId: varchar("submission_id")
      .notNull()
      .references(() => cmsFormSubmissions.id, { onDelete: "cascade" }),
    deduplicationKey: text("deduplication_key").notNull(),
    payload: jsonb("payload").$type<CmsFormEffectPayload>().notNull(),
    status: text("status")
      .$type<"queued" | "processing" | "completed" | "skipped" | "failed">()
      .notNull()
      .default("queued"),
    attemptCount: integer("attempt_count").notNull().default(0),
    processingToken: varchar("processing_token"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    lastErrorCode: varchar("last_error_code", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_cms_form_effect_jobs_deduplication").on(
      table.submissionId,
      table.deduplicationKey,
    ),
    index("idx_cms_form_effect_jobs_ready").on(table.status, table.nextAttemptAt, table.createdAt),
  ],
);

export type CmsFormEffectJob = typeof cmsFormEffectJobs.$inferSelect;
