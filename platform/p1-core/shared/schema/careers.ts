import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { therapistProfiles } from "./therapist-profiles";

export const CAREER_JOB_STATUSES = ["draft", "published", "closed", "archived"] as const;
export const CAREER_JOB_VISIBILITIES = ["public", "internal"] as const;
export const CAREER_EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "volunteer",
] as const;
export const CAREER_WORK_MODES = ["on_site", "hybrid", "remote"] as const;
export const CAREER_APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "interviewing",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export type CareerJobStatus = (typeof CAREER_JOB_STATUSES)[number];
export type CareerJobVisibility = (typeof CAREER_JOB_VISIBILITIES)[number];
export type CareerEmploymentType = (typeof CAREER_EMPLOYMENT_TYPES)[number];
export type CareerWorkMode = (typeof CAREER_WORK_MODES)[number];
export type CareerApplicationStatus = (typeof CAREER_APPLICATION_STATUSES)[number];

export const CAREER_JOB_STATUS_LABELS: Record<CareerJobStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
  archived: "Archived",
};

export const CAREER_EMPLOYMENT_TYPE_LABELS: Record<CareerEmploymentType, string> = {
  full_time: "Full-Time",
  part_time: "Part-Time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
  volunteer: "Volunteer",
};

export const CAREER_WORK_MODE_LABELS: Record<CareerWorkMode, string> = {
  on_site: "On-Site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const CAREER_APPLICATION_STATUS_LABELS: Record<CareerApplicationStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const careerJobs = pgTable(
  "career_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    department: text("department"),
    employmentType: text("employment_type")
      .$type<CareerEmploymentType>()
      .notNull()
      .default("full_time"),
    workMode: text("work_mode").$type<CareerWorkMode>().notNull().default("on_site"),
    location: text("location"),
    locationAddress: text("location_address"),
    directoryProfileId: varchar("directory_profile_id").references(() => therapistProfiles.id, {
      onDelete: "set null",
    }),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency").notNull().default("USD"),
    salaryPeriod: text("salary_period").notNull().default("year"),
    salaryVisible: boolean("salary_visible").notNull().default(false),
    status: text("status").$type<CareerJobStatus>().notNull().default("draft"),
    visibility: text("visibility").$type<CareerJobVisibility>().notNull().default("public"),
    summary: text("summary"),
    description: text("description"),
    requirements: text("requirements"),
    benefits: text("benefits"),
    applicationInstructions: text("application_instructions"),
    publishedAt: timestamp("published_at"),
    closesAt: timestamp("closes_at"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    noindex: boolean("noindex").notNull().default(false),
    integrationMetadata: jsonb("integration_metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_career_jobs_slug").on(table.slug),
    index("idx_career_jobs_public").on(table.status, table.visibility, table.publishedAt),
    index("idx_career_jobs_department").on(table.department),
    index("idx_career_jobs_location").on(table.location),
    index("idx_career_jobs_directory_profile").on(table.directoryProfileId),
    index("idx_career_jobs_updated_at").on(table.updatedAt),
  ],
);

export const careerApplications = pgTable(
  "career_applications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: varchar("job_id")
      .notNull()
      .references(() => careerJobs.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    coverLetter: text("cover_letter"),
    linkedinUrl: text("linkedin_url"),
    portfolioUrl: text("portfolio_url"),
    resumeFileName: text("resume_file_name").notNull(),
    resumeMimeType: text("resume_mime_type").notNull(),
    resumeFileSize: integer("resume_file_size").notNull(),
    resumeStorageKey: text("resume_storage_key").notNull(),
    status: text("status").$type<CareerApplicationStatus>().notNull().default("new"),
    source: text("source").notNull().default("website"),
    consentAccepted: boolean("consent_accepted").notNull().default(false),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    integrationMetadata: jsonb("integration_metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_career_applications_job").on(table.jobId),
    index("idx_career_applications_status").on(table.status),
    index("idx_career_applications_created").on(table.createdAt),
    index("idx_career_applications_email").on(table.email),
  ],
);

export const careerApplicationNotes = pgTable(
  "career_application_notes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    applicationId: varchar("application_id")
      .notNull()
      .references(() => careerApplications.id, { onDelete: "cascade" }),
    note: text("note").notNull(),
    statusFrom: text("status_from").$type<CareerApplicationStatus>(),
    statusTo: text("status_to").$type<CareerApplicationStatus>(),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_career_application_notes_application").on(table.applicationId),
    index("idx_career_application_notes_created").on(table.createdAt),
  ],
);

export const careerShareSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  copyLink: z.boolean().default(true),
  nativeShare: z.boolean().default(true),
  email: z.boolean().default(true),
  linkedin: z.boolean().default(true),
  facebook: z.boolean().default(true),
  x: z.boolean().default(true),
});

export const careerIntegrationSettingsSchema = z.object({
  googleIndexingEnabled: z.boolean().default(false),
  googleServiceAccountJson: z.string().optional().default(""),
  indeedFeedEnabled: z.boolean().default(false),
  indeedApplyEnabled: z.boolean().default(false),
  indeedApplySecret: z.string().optional().default(""),
  indeedDispositionSyncEnabled: z.boolean().default(false),
  zipRecruiterEnabled: z.boolean().default(false),
  zipRecruiterApiKey: z.string().optional().default(""),
  linkedinApiEnabled: z.boolean().default(false),
  linkedinPartnerId: z.string().optional().default(""),
  genericWebhookEnabled: z.boolean().default(false),
  genericWebhookUrl: z.string().optional().default(""),
  genericWebhookSecret: z.string().optional().default(""),
});

export const careerSettingsSchema = z.object({
  sharing: careerShareSettingsSchema.default({}),
  integrations: careerIntegrationSettingsSchema.default({}),
});

export type CareerShareSettings = z.infer<typeof careerShareSettingsSchema>;
export type CareerIntegrationSettings = z.infer<typeof careerIntegrationSettingsSchema>;
export type CareerSettings = z.infer<typeof careerSettingsSchema>;

export const insertCareerJobSchema = createInsertSchema(careerJobs, {
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must use lowercase letters, numbers, and hyphens only",
    ),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const publicCareerApplicationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().optional().default(""),
  coverLetter: z.string().optional().default(""),
  linkedinUrl: z.string().optional().default(""),
  portfolioUrl: z.string().optional().default(""),
  consentAccepted: z.coerce.boolean().refine((value) => value, "Consent is required"),
  source: z.string().optional().default("website"),
});

export const insertCareerApplicationSchema = createInsertSchema(careerApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCareerApplicationNoteSchema = createInsertSchema(careerApplicationNotes).omit({
  id: true,
  createdAt: true,
});

export type CareerJob = typeof careerJobs.$inferSelect;
export type InsertCareerJob = z.infer<typeof insertCareerJobSchema>;
export type CareerApplication = typeof careerApplications.$inferSelect;
export type InsertCareerApplication = z.infer<typeof insertCareerApplicationSchema>;
export type CareerApplicationNote = typeof careerApplicationNotes.$inferSelect;
export type InsertCareerApplicationNote = z.infer<typeof insertCareerApplicationNoteSchema>;
export type PublicCareerApplication = z.infer<typeof publicCareerApplicationSchema>;
