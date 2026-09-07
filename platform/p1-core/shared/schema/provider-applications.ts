import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const providerApplications = pgTable(
  "provider_applications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("draft"),
    currentStep: integer("current_step").notNull().default(0),
    formData: jsonb("form_data").default({}),
    submittedSnapshot: jsonb("submitted_snapshot"),
    paymentStatus: text("payment_status").notNull().default("not_started"),
    paidAt: timestamp("paid_at"),
    amountPaid: integer("amount_paid"),
    refundEligibleAmount: integer("refund_eligible_amount"),
    refundStatus: text("refund_status"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    referencesStatus: text("references_status").notNull().default("not_started"),
    backgroundCheckStatus: text("background_check_status").notNull().default("not_started"),
    interviewStatus: text("interview_status").notNull().default("not_started"),
    decisionStatus: text("decision_status").notNull().default("not_started"),
    submittedAt: timestamp("submitted_at"),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_pa_user_id").on(table.userId), index("idx_pa_status").on(table.status)],
);

export const providerApplicationTimeline = pgTable(
  "provider_application_timeline",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    applicationId: varchar("application_id")
      .notNull()
      .references(() => providerApplications.id),
    action: text("action").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    note: text("note"),
    performedBy: varchar("performed_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_pat_app_id").on(table.applicationId)],
);

export const providerApplicationCredentials = pgTable(
  "provider_application_credentials",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    applicationId: varchar("application_id")
      .notNull()
      .references(() => providerApplications.id),
    credentialType: text("credential_type").notNull(),
    issuer: text("issuer"),
    licenseNumber: text("license_number"),
    stateOrCountry: text("state_or_country"),
    middleName: text("middle_name"),
    verificationUrl: text("verification_url"),
    issuedAt: timestamp("issued_at"),
    expiresAt: timestamp("expires_at"),
    documentUrl: text("document_url"),
    verificationStatus: text("verification_status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_pac_app_id").on(table.applicationId)],
);

export const providerApplicationReferences = pgTable(
  "provider_application_references",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    applicationId: varchar("application_id")
      .notNull()
      .references(() => providerApplications.id),
    refereeName: text("referee_name").notNull(),
    refereeEmail: text("referee_email").notNull(),
    refereePhone: text("referee_phone"),
    relationship: text("relationship"),
    status: text("status").notNull().default("pending"),
    secureToken: varchar("secure_token", { length: 128 }),
    applicantNameSnapshot: text("applicant_name_snapshot"),
    emailSentAt: timestamp("email_sent_at"),
    openedAt: timestamp("opened_at"),
    responseReceivedAt: timestamp("response_received_at"),
    responseData: jsonb("response_data"),
    concernFlags: jsonb("concern_flags"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_par_app_id").on(table.applicationId),
    index("idx_par_token").on(table.secureToken),
  ],
);

export const providerBackgroundChecks = pgTable(
  "provider_background_checks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    applicationId: varchar("application_id")
      .notNull()
      .references(() => providerApplications.id),
    vendorName: text("vendor_name"),
    vendorExternalId: text("vendor_external_id"),
    status: text("status").notNull().default("not_sent"),
    providerFacingLabel: text("provider_facing_label").notNull().default("Not Started"),
    adminStatusDetails: text("admin_status_details"),
    notes: text("notes"),
    result: text("result"),
    requestedAt: timestamp("requested_at"),
    lastStatusSyncAt: timestamp("last_status_sync_at"),
    completedAt: timestamp("completed_at"),
    reportUrl: text("report_url"),
    provider: text("provider"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_pbc_app_id").on(table.applicationId)],
);

export const providerInterviews = pgTable(
  "provider_interviews",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    applicationId: varchar("application_id")
      .notNull()
      .references(() => providerApplications.id),
    scheduledAt: timestamp("scheduled_at"),
    completedAt: timestamp("completed_at"),
    interviewerUserId: varchar("interviewer_user_id").references(() => users.id),
    format: text("format").default("video"),
    meetingUrl: text("meeting_url"),
    notes: text("notes"),
    outcome: text("outcome"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_pi_app_id").on(table.applicationId)],
);

export const providerApplicationDecisions = pgTable(
  "provider_application_decisions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    applicationId: varchar("application_id")
      .notNull()
      .references(() => providerApplications.id),
    decision: text("decision").notNull(),
    reason: text("reason"),
    decidedBy: varchar("decided_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_pad_app_id").on(table.applicationId)],
);

export const insertProviderApplicationSchema = createInsertSchema(providerApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderApplicationTimelineSchema = createInsertSchema(
  providerApplicationTimeline,
).omit({
  id: true,
  createdAt: true,
});

export const insertProviderApplicationCredentialSchema = createInsertSchema(
  providerApplicationCredentials,
).omit({
  id: true,
  createdAt: true,
});

export const insertProviderApplicationReferenceSchema = createInsertSchema(
  providerApplicationReferences,
).omit({
  id: true,
  createdAt: true,
});

export const insertProviderBackgroundCheckSchema = createInsertSchema(
  providerBackgroundChecks,
).omit({
  id: true,
  createdAt: true,
});

export const insertProviderInterviewSchema = createInsertSchema(providerInterviews).omit({
  id: true,
  createdAt: true,
});

export const insertProviderApplicationDecisionSchema = createInsertSchema(
  providerApplicationDecisions,
).omit({
  id: true,
  createdAt: true,
});

export type InsertProviderApplication = z.infer<typeof insertProviderApplicationSchema>;
export type ProviderApplication = typeof providerApplications.$inferSelect;
export type ProviderApplicationTimeline = typeof providerApplicationTimeline.$inferSelect;
export type ProviderApplicationCredential = typeof providerApplicationCredentials.$inferSelect;
export type ProviderApplicationReference = typeof providerApplicationReferences.$inferSelect;
export type ProviderBackgroundCheck = typeof providerBackgroundChecks.$inferSelect;
export type ProviderInterview = typeof providerInterviews.$inferSelect;
export type ProviderApplicationDecision = typeof providerApplicationDecisions.$inferSelect;
