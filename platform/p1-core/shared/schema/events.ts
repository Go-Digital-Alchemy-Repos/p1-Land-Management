import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  index,
  foreignKey,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { cmsForms } from "./forms";

export const EVENT_TYPES = [
  "training",
  "workshop",
  "webinar",
  "class",
  "consultation",
  "appointment",
  "community_event",
] as const;

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  training: "Training",
  workshop: "Workshop",
  webinar: "Webinar",
  class: "Class",
  consultation: "Consultation",
  appointment: "Appointment",
  community_event: "Community Event",
};

export const EVENT_CATEGORIES = [
  "education",
  "professional_development",
  "wellness",
  "community",
  "consulting",
  "support",
  "operations",
] as const;

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  education: "Education",
  professional_development: "Professional Development",
  wellness: "Wellness",
  community: "Community",
  consulting: "Consulting",
  support: "Support",
  operations: "Operations",
};

export const EVENT_AUDIENCES = [
  "public",
  "members",
  "professionals",
  "clients",
  "staff",
  "invited",
] as const;

export const EVENT_AUDIENCE_LABELS: Record<EventAudience, string> = {
  public: "Public",
  members: "Members",
  professionals: "Professionals",
  clients: "Clients",
  staff: "Staff",
  invited: "Invited Guests",
};

export const EVENT_FORMATS = [
  "single_session",
  "multi_session",
  "series",
  "office_hours",
  "one_on_one",
  "drop_in",
] as const;

export const EVENT_FORMAT_LABELS: Record<EventFormat, string> = {
  single_session: "Single Session",
  multi_session: "Multi-Session",
  series: "Series",
  office_hours: "Office Hours",
  one_on_one: "One-on-One",
  drop_in: "Drop-In",
};

export const EVENT_DELIVERY_MODES = ["in_person", "virtual", "hybrid"] as const;

export const EVENT_DELIVERY_MODE_LABELS: Record<EventDeliveryMode, string> = {
  in_person: "In-Person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

export const EVENT_REGISTRATION_APPROVAL_MODES = ["automatic", "manual"] as const;

export const EVENT_REGISTRATION_APPROVAL_MODE_LABELS: Record<
  EventRegistrationApprovalMode,
  string
> = {
  automatic: "Automatic Confirmation",
  manual: "Manual Approval",
};

export const EVENT_STATUSES = ["draft", "published", "canceled", "completed", "archived"] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export type EventAudience = (typeof EVENT_AUDIENCES)[number];
export type EventFormat = (typeof EVENT_FORMATS)[number];
export type EventDeliveryMode = (typeof EVENT_DELIVERY_MODES)[number];
export type EventRegistrationApprovalMode = (typeof EVENT_REGISTRATION_APPROVAL_MODES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_PRESET_DEFAULTS: Record<
  EventType,
  {
    category: EventCategory;
    audience: EventAudience;
    format: EventFormat;
    deliveryMode: EventDeliveryMode;
    registrationEnabled: boolean;
    registrationApprovalMode: EventRegistrationApprovalMode;
  }
> = {
  training: {
    category: "professional_development",
    audience: "professionals",
    format: "single_session",
    deliveryMode: "virtual",
    registrationEnabled: true,
    registrationApprovalMode: "automatic",
  },
  workshop: {
    category: "education",
    audience: "public",
    format: "single_session",
    deliveryMode: "hybrid",
    registrationEnabled: true,
    registrationApprovalMode: "automatic",
  },
  webinar: {
    category: "education",
    audience: "public",
    format: "single_session",
    deliveryMode: "virtual",
    registrationEnabled: true,
    registrationApprovalMode: "automatic",
  },
  class: {
    category: "education",
    audience: "members",
    format: "series",
    deliveryMode: "in_person",
    registrationEnabled: true,
    registrationApprovalMode: "automatic",
  },
  consultation: {
    category: "consulting",
    audience: "clients",
    format: "one_on_one",
    deliveryMode: "virtual",
    registrationEnabled: true,
    registrationApprovalMode: "manual",
  },
  appointment: {
    category: "support",
    audience: "clients",
    format: "one_on_one",
    deliveryMode: "in_person",
    registrationEnabled: true,
    registrationApprovalMode: "manual",
  },
  community_event: {
    category: "community",
    audience: "public",
    format: "drop_in",
    deliveryMode: "hybrid",
    registrationEnabled: true,
    registrationApprovalMode: "automatic",
  },
};

export const eventVenues = pgTable(
  "event_venues",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    address: text("address"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country"),
    phone: text("phone"),
    email: text("email"),
    websiteUrl: text("website_url"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    parkingInfo: text("parking_info"),
    accessibilityInfo: text("accessibility_info"),
    transitInfo: text("transit_info"),
    arrivalNotes: text("arrival_notes"),
    isVirtual: boolean("is_virtual").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_event_venues_slug").on(table.slug),
    index("idx_event_venues_name").on(table.name),
  ],
);

export const eventOrganizers = pgTable(
  "event_organizers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    email: text("email"),
    phone: text("phone"),
    websiteUrl: text("website_url"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_event_organizers_slug").on(table.slug),
    index("idx_event_organizers_name").on(table.name),
  ],
);

export const events = pgTable(
  "events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    date: timestamp("date").notNull(),
    endDate: timestamp("end_date"),
    location: text("location"),
    isVirtual: boolean("is_virtual").default(false),
    zoomLink: text("zoom_link"),
    memberOnly: boolean("member_only").default(false),
    imageUrl: text("image_url"),
    imagePositionX: integer("image_position_x").default(50),
    imagePositionY: integer("image_position_y").default(50),
    createdAt: timestamp("created_at").defaultNow(),

    virtualJoinUrl: text("virtual_join_url"),
    virtualDialInInfo: text("virtual_dial_in_info"),
    recordingUrl: text("recording_url"),
    showInArchives: boolean("show_in_archives").default(false),
    recordingAccess: text("recording_access").default("free"),
    recordingPrice: integer("recording_price"),

    registrationEnabled: boolean("registration_enabled").default(false),
    registrationType: text("registration_type").default("free"),
    registrationFee: integer("registration_fee"),
    registrationCurrency: text("registration_currency").default("usd"),
    registrationOpensAt: timestamp("registration_opens_at"),
    registrationClosesAt: timestamp("registration_closes_at"),
    capacity: integer("capacity"),
    waitlistEnabled: boolean("waitlist_enabled").default(false),

    status: text("status").default("published"),
    visibility: text("visibility").default("public"),
    eventType: text("event_type").$type<EventType>(),
    category: text("category").$type<EventCategory>(),
    audience: text("audience").$type<EventAudience>(),
    format: text("format").$type<EventFormat>(),
    deliveryMode: text("delivery_mode").$type<EventDeliveryMode>(),
    tags: jsonb("tags")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    registrationFormId: varchar("registration_form_id").references(() => cmsForms.id, {
      onDelete: "set null",
    }),
    registrationApprovalMode: text("registration_approval_mode")
      .$type<EventRegistrationApprovalMode>()
      .default("automatic"),

    timezone: text("timezone"),
    venueId: varchar("venue_id"),
    organizerId: varchar("organizer_id"),
    locationName: text("location_name"),
    locationAddress: text("location_address"),
    latitude: text("latitude"),
    longitude: text("longitude"),

    speakerName: text("speaker_name"),
    speakerBio: text("speaker_bio"),
    speakerImageUrl: text("speaker_image_url"),

    isRecurring: boolean("is_recurring").default(false),
    recurrencePattern: text("recurrence_pattern"),
    recurrenceInterval: integer("recurrence_interval"),
    recurrenceDaysOfWeek: text("recurrence_days_of_week"),
    recurrenceEndDate: timestamp("recurrence_end_date"),
    recurrenceCount: integer("recurrence_count"),
    parentEventId: varchar("parent_event_id"),
  },
  (table) => [
    index("idx_events_date").on(table.date),
    index("idx_events_slug").on(table.slug),
    index("idx_events_status_visibility").on(table.status, table.visibility),
    index("idx_events_type_category").on(table.eventType, table.category),
    index("idx_events_registration_form_id").on(table.registrationFormId),
    index("idx_events_venue_id").on(table.venueId),
    index("idx_events_organizer_id").on(table.organizerId),
    foreignKey({
      columns: [table.parentEventId],
      foreignColumns: [table.id],
      name: "events_parent_event_id_events_id_fk",
    }),
    foreignKey({
      columns: [table.venueId],
      foreignColumns: [eventVenues.id],
      name: "events_venue_id_event_venues_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.organizerId],
      foreignColumns: [eventOrganizers.id],
      name: "events_organizer_id_event_organizers_id_fk",
    }).onDelete("set null"),
  ],
);

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});
export const insertEventVenueSchema = createInsertSchema(eventVenues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEventOrganizerSchema = createInsertSchema(eventOrganizers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEventVenue = z.infer<typeof insertEventVenueSchema>;
export type EventVenue = typeof eventVenues.$inferSelect;
export type InsertEventOrganizer = z.infer<typeof insertEventOrganizerSchema>;
export type EventOrganizer = typeof eventOrganizers.$inferSelect;
