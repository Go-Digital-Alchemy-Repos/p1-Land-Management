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

export const PORTFOLIO_INDUSTRIES = [
  "real_estate",
  "web_development",
  "artist_creative",
  "generic",
] as const;
export const PORTFOLIO_STATUSES = ["draft", "published", "archived"] as const;
export const PORTFOLIO_VISIBILITIES = ["public", "private"] as const;
export const PORTFOLIO_ARCHIVE_LAYOUTS = ["grid", "list"] as const;

export type PortfolioIndustry = (typeof PORTFOLIO_INDUSTRIES)[number];
export type PortfolioStatus = (typeof PORTFOLIO_STATUSES)[number];
export type PortfolioVisibility = (typeof PORTFOLIO_VISIBILITIES)[number];
export type PortfolioArchiveLayout = (typeof PORTFOLIO_ARCHIVE_LAYOUTS)[number];

export const PORTFOLIO_INDUSTRY_LABELS: Record<PortfolioIndustry, string> = {
  real_estate: "Real Estate",
  web_development: "Web / Development",
  artist_creative: "Artist / Creative",
  generic: "Generic",
};

export const PORTFOLIO_STATUS_LABELS: Record<PortfolioStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const PORTFOLIO_VISIBILITY_LABELS: Record<PortfolioVisibility, string> = {
  public: "Public",
  private: "Private",
};

export const portfolioGalleryItemSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional().default(""),
  caption: z.string().optional().default(""),
});

export const portfolioVideoSchema = z.object({
  title: z.string().optional().default(""),
  url: z.string().min(1),
  posterUrl: z.string().optional().default(""),
  caption: z.string().optional().default(""),
});

export const portfolioSectionSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional().default(""),
});

export const portfolioMetricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional().default(""),
});

export type PortfolioGalleryItem = z.infer<typeof portfolioGalleryItemSchema>;
export type PortfolioVideo = z.infer<typeof portfolioVideoSchema>;
export type PortfolioSection = z.infer<typeof portfolioSectionSchema>;
export type PortfolioMetric = z.infer<typeof portfolioMetricSchema>;

export const portfolioProjects = pgTable(
  "portfolio_projects",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    subtitle: text("subtitle"),
    location: text("location"),
    industry: text("industry").$type<PortfolioIndustry>().notNull().default("generic"),
    projectType: text("project_type"),
    clientName: text("client_name"),
    services: text("services").array(),
    technologies: text("technologies").array(),
    categories: text("categories").array(),
    tags: text("tags").array(),
    status: text("status").$type<PortfolioStatus>().notNull().default("draft"),
    visibility: text("visibility").$type<PortfolioVisibility>().notNull().default("public"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    publishedAt: timestamp("published_at"),
    summary: text("summary"),
    description: text("description"),
    challenge: text("challenge"),
    solution: text("solution"),
    results: text("results"),
    testimonial: text("testimonial"),
    testimonialAuthor: text("testimonial_author"),
    heroImageUrl: text("hero_image_url"),
    heroImageAlt: text("hero_image_alt"),
    gallery: jsonb("gallery")
      .$type<PortfolioGalleryItem[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    videos: jsonb("videos")
      .$type<PortfolioVideo[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    sections: jsonb("sections")
      .$type<PortfolioSection[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    metrics: jsonb("metrics")
      .$type<PortfolioMetric[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    ctaLabel: text("cta_label"),
    ctaUrl: text("cta_url"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    noindex: boolean("noindex").notNull().default(false),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_portfolio_projects_slug").on(table.slug),
    index("idx_portfolio_projects_public").on(table.status, table.visibility, table.publishedAt),
    index("idx_portfolio_projects_industry").on(table.industry),
    index("idx_portfolio_projects_featured").on(table.featured),
    index("idx_portfolio_projects_sort").on(table.sortOrder, table.updatedAt),
  ],
);

export const portfolioSettingsSchema = z.object({
  industryPreset: z.enum(PORTFOLIO_INDUSTRIES).default("generic"),
  archiveLayout: z.enum(PORTFOLIO_ARCHIVE_LAYOUTS).default("grid"),
  archiveEyebrow: z.string().default("Portfolio"),
  archiveHeading: z.string().default("Selected Work"),
  archiveSubheading: z
    .string()
    .default("Explore case studies, projects, and outcomes from our portfolio."),
  projectsLabel: z.string().default("Projects"),
  projectLabel: z.string().default("Project"),
  showSearch: z.boolean().default(true),
  showIndustryFilter: z.boolean().default(true),
  showCategoryFilter: z.boolean().default(true),
  showLocationFilter: z.boolean().default(true),
  sharingEnabled: z.boolean().default(true),
  defaultCtaLabel: z.string().default("Start a Project"),
  defaultCtaUrl: z.string().default("/contact"),
});

export type PortfolioSettings = z.infer<typeof portfolioSettingsSchema>;

export const insertPortfolioProjectSchema = createInsertSchema(portfolioProjects, {
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must use lowercase letters, numbers, and hyphens only",
    ),
  industry: z.enum(PORTFOLIO_INDUSTRIES).default("generic"),
  status: z.enum(PORTFOLIO_STATUSES).default("draft"),
  visibility: z.enum(PORTFOLIO_VISIBILITIES).default("public"),
  gallery: z.array(portfolioGalleryItemSchema).default([]),
  videos: z.array(portfolioVideoSchema).default([]),
  sections: z.array(portfolioSectionSchema).default([]),
  metrics: z.array(portfolioMetricSchema).default([]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPortfolioProject = z.infer<typeof insertPortfolioProjectSchema>;
export type PortfolioProject = typeof portfolioProjects.$inferSelect;
