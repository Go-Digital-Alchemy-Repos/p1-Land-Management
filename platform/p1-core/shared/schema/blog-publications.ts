import { validateBlogCoverImageSet, type BlogCoverImageSet } from "../blog-cover-image-set";
import { validateBlogPresentation, type BlogPresentation } from "../blog-presentation";
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  unique,
  uniqueIndex,
  foreignKey,
  check,
  type PgTableExtraConfigValue,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// Publication state is deliberately separate from legacy mutable blog_posts.
export const blogEditorialSchema = z
  .object({
    title: z.string().refine((value) => value.trim().length > 0, "Title is required"),
    slug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    excerpt: z.string().nullable(),
    content: z.string(),
    authorName: z.string().refine((value) => value.trim().length > 0, "Author name is required"),
    coverImageUrl: z.string().nullable(),
    coverImagePositionX: z.number().int().min(0).max(100).nullable(),
    coverImagePositionY: z.number().int().min(0).max(100).nullable(),
    category: z.string().nullable(),
    categories: z.array(z.string()).nullable(),
    tags: z.array(z.string()).nullable(),
    postType: z.string().nullable(),
    podcastUrl: z.string().nullable(),
    externalUrl: z.string().nullable(),
    sidebarId: z.string().nullable(),
    seoTitle: z.string().nullable(),
    seoDescription: z.string().nullable(),
    ogImageUrl: z.string().nullable(),
    noindex: z.boolean().nullable(),
    presentation: z.custom<BlogPresentation>().nullable().optional(),
    coverImageSet: z.custom<BlogCoverImageSet>().nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.coverImageSet != null &&
      !validateBlogCoverImageSet(value.coverImageSet, value.coverImageUrl)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coverImageSet"],
        message: "Invalid responsive cover image set",
      });
    if (
      value.presentation !== undefined &&
      value.presentation !== null &&
      !validateBlogPresentation(value.presentation, value.title)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["presentation"],
        message: "Invalid editorial presentation metadata",
      });
    }
  });
export type BlogEditorialSnapshot = z.infer<typeof blogEditorialSchema>;
export const blogProvenanceSchema = z
  .object({
    kind: z.literal("legacy-adoption"),
    sourceReference: z.string().trim().min(1).max(1000),
    reason: z.string().trim().min(1).max(2000),
  })
  .strict();
export type BlogProvenance = z.infer<typeof blogProvenanceSchema>;
// Constraint names match hand migration0004. Drizzle cannot model INITIALLY
// DEFERRED or immutable-row triggers; SQL migrations remain authoritative.
export const blogPublicationState = pgTable(
  "blog_publication_state",
  {
    postId: text("post_id").primaryKey(),
    version: integer("version").notNull(),
    draftRevisionId: text("draft_revision_id").notNull(),
    publishedRevisionId: text("published_revision_id"),
    lastPublishedRevisionId: text("last_published_revision_id"),
    publicationGeneration: integer("publication_generation").notNull().default(0),
    visibility: text("visibility").notNull().default("unpublished"),
    legacyFingerprint: text("legacy_fingerprint").notNull(),
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
    lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table): PgTableExtraConfigValue[] => [
    check("blog_publication_state_version_check", sql`${table.version}>0`),
    check(
      "blog_publication_state_publication_generation_check",
      sql`${table.publicationGeneration}>=0`,
    ),
    check(
      "blog_publication_state_visibility_check",
      sql`${table.visibility} IN ('unpublished','published','deleted')`,
    ),
    check(
      "blog_publication_state_check",
      sql`(${table.visibility}='published') = (${table.publishedRevisionId} IS NOT NULL)`,
    ),
    foreignKey({
      name: "blog_draft_pointer",
      columns: [table.postId, table.draftRevisionId],
      foreignColumns: [blogPostRevisions.postId, blogPostRevisions.id],
    }),
    foreignKey({
      name: "blog_published_pointer",
      columns: [table.postId, table.publishedRevisionId],
      foreignColumns: [blogPostRevisions.postId, blogPostRevisions.id],
    }),
    foreignKey({
      name: "blog_last_published_pointer",
      columns: [table.postId, table.lastPublishedRevisionId],
      foreignColumns: [blogPostRevisions.postId, blogPostRevisions.id],
    }),
  ],
);
export const blogPostRevisions = pgTable(
  "blog_post_revisions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    postId: text("post_id").notNull(),
    version: integer("version").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    snapshot: jsonb("snapshot").$type<BlogEditorialSnapshot>().notNull(),
    action: text("action").notNull(),
    actorId: text("actor_id").notNull(),
    editorInstanceId: text("editor_instance_id"),
    sourceRevisionId: text("source_revision_id"),
    provenance: jsonb("provenance").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table): PgTableExtraConfigValue[] => [
    unique("blog_post_revisions_post_id_version_key").on(table.postId, table.version),
    unique("blog_post_revisions_post_id_id_key").on(table.postId, table.id),
    foreignKey({
      name: "blog_post_revisions_post_id_fkey",
      columns: [table.postId],
      foreignColumns: [blogPublicationState.postId],
    }),
    check("blog_post_revisions_version_check", sql`${table.version}>0`),
    check("blog_post_revisions_schema_version_check", sql`${table.schemaVersion}=1`),
    check("blog_post_revisions_snapshot_check", sql`jsonb_typeof(${table.snapshot})='object'`),
    check(
      "blog_post_revisions_action_check",
      sql`${table.action} IN ('initialize','save','publish','unpublish','restore','delete','schedule','cancel_schedule','scheduled_publish','schedule_failed')`,
    ),
    check("blog_post_revisions_actor_id_check", sql`length(${table.actorId})>0`),
    check("blog_post_revisions_provenance_check", sql`jsonb_typeof(${table.provenance})='object'`),
  ],
);
export const blogPublicationRoutes = pgTable(
  "blog_publication_routes",
  {
    slug: text("slug").primaryKey(),
    postId: text("post_id").notNull(),
    generation: integer("generation").notNull(),
    revisionId: text("revision_id"),
    state: text("state").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table): PgTableExtraConfigValue[] => [
    foreignKey({
      name: "blog_publication_routes_post_id_fkey",
      columns: [table.postId],
      foreignColumns: [blogPublicationState.postId],
    }),
    foreignKey({
      name: "blog_publication_routes_post_id_revision_id_fkey",
      columns: [table.postId, table.revisionId],
      foreignColumns: [blogPostRevisions.postId, blogPostRevisions.id],
    }),
    check("blog_publication_routes_generation_check", sql`${table.generation}>0`),
    check("blog_publication_routes_state_check", sql`${table.state} IN ('published','withdrawn')`),
    check(
      "blog_publication_routes_check",
      sql`(${table.state}='published') = (${table.revisionId} IS NOT NULL)`,
    ),
  ],
);

export const blogPublicationSchedules = pgTable(
  "blog_publication_schedules",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    postId: text("post_id").notNull(),
    revisionId: text("revision_id").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"),
    createdVersion: integer("created_version").notNull(),
    actorId: text("actor_id").notNull(),
    failureCode: text("failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table): PgTableExtraConfigValue[] => [
    foreignKey({
      name: "blog_schedule_post_fk",
      columns: [table.postId],
      foreignColumns: [blogPublicationState.postId],
    }),
    foreignKey({
      name: "blog_schedule_revision_fk",
      columns: [table.postId, table.revisionId],
      foreignColumns: [blogPostRevisions.postId, blogPostRevisions.id],
    }),
    check(
      "blog_schedule_status_check",
      sql`${table.status} IN ('pending','published','cancelled','failed')`,
    ),
    check("blog_schedule_version_check", sql`${table.createdVersion}>0`),
    uniqueIndex("blog_schedule_one_pending")
      .on(table.postId)
      .where(sql`${table.status}='pending'`),
  ],
);

/** Permanent ownership receipts. Deferrability and immutability are migration-managed. */
export const STATIC_BLOG_SOURCE_SLUGS = [
  "land-clearing-cost-per-acre-south-carolina",
  "how-to-manage-retention-pond-south-carolina",
  "best-grass-large-acreage-carolinas",
  "signs-property-drainage-problem",
  "preparing-land-agricultural-use-carolinas",
] as const;
export const blogStaticImportReceipts = pgTable(
  "blog_static_import_receipts",
  {
    sourceSlug: text("source_slug").primaryKey(),
    postId: text("post_id").notNull(),
    receiptId: text("receipt_id").notNull(),
    importedRevisionId: text("imported_revision_id").notNull(),
    bundleSha256: text("bundle_sha256").notNull(),
    editorialSha256: text("editorial_sha256").notNull(),
    actorId: text("actor_id").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
    sourceManifest: jsonb("source_manifest").$type<Record<string, unknown>>().notNull(),
  },
  (table): PgTableExtraConfigValue[] => [
    unique("blog_static_receipt_post_unique").on(table.postId),
    unique("blog_static_receipt_id_unique").on(table.receiptId),
    foreignKey({
      name: "blog_static_receipt_post_fk",
      columns: [table.postId],
      foreignColumns: [blogPublicationState.postId],
    }),
    foreignKey({
      name: "blog_static_receipt_revision_fk",
      columns: [table.postId, table.importedRevisionId],
      foreignColumns: [blogPostRevisions.postId, blogPostRevisions.id],
    }),
    check(
      "blog_static_receipt_slug_check",
      sql`${table.sourceSlug} IN ('land-clearing-cost-per-acre-south-carolina','how-to-manage-retention-pond-south-carolina','best-grass-large-acreage-carolinas','signs-property-drainage-problem','preparing-land-agricultural-use-carolinas')`,
    ),
    check(
      "blog_static_receipt_hash_check",
      sql`${table.bundleSha256} ~ '^[0-9a-f]{64}$' AND ${table.editorialSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "blog_static_receipt_identity_check",
      sql`length(trim(${table.actorId}))>0 AND length(trim(${table.receiptId}))>0`,
    ),
    check(
      "blog_static_receipt_manifest_check",
      sql`jsonb_typeof(${table.sourceManifest})='object' AND ${table.sourceManifest}<>'{}'::jsonb`,
    ),
  ],
);
