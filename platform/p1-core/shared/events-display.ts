// Data-only display constants shared by schemas and browser presentations.
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
