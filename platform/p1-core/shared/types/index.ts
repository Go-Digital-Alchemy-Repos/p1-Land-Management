export type {
  TherapistWithUser,
  PaginatedTherapists,
  DirectoryFilterOptions,
  TherapistSearchParams,
} from "./directory";
export type { PublicSearchResult, PublicSearchResultType } from "./public-search";
export { therapistSearchSchema, SortOption } from "./directory";
export type { SortOption as SortOptionType } from "./directory";

export const UserRole = {
  ADMIN: "admin",
  EDITOR: "editor",
  THERAPIST: "therapist",
  CLIENT: "client",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AdminPermission = {
  DIRECTORY: "directory",
  CONTENT: "content",
  DESIGN: "design",
  CRM: "crm",
} as const;
export type AdminPermission = (typeof AdminPermission)[keyof typeof AdminPermission];

export const PracticeMode = {
  IN_PERSON: "in_person",
  VIRTUAL: "virtual",
  BOTH: "both",
} as const;
export type PracticeMode = (typeof PracticeMode)[keyof typeof PracticeMode];

export const SubscriptionStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  TRIALING: "trialing",
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const DocCategory = {
  GETTING_STARTED: "Getting Started",
  USER_MANAGEMENT: "User Management",
  THERAPIST_MANAGEMENT: "Provider Management",
  SUBSCRIPTIONS_BILLING: "Subscriptions & Billing",
  DIRECTORY_SEARCH: "Directory & Search",
  EVENTS: "Events",
  API_REFERENCE: "API Reference",
  SYSTEM_ARCHITECTURE: "System Architecture",
} as const;
export type DocCategory = (typeof DocCategory)[keyof typeof DocCategory];

export const SPECIALIZATIONS = [
  "Consulting",
  "Coaching",
  "Implementation",
  "Training",
  "Managed Services",
  "Operations",
  "Strategy",
  "Customer Success",
  "Marketing",
  "Sales Enablement",
  "Technology",
  "Design",
  "Finance",
  "Legal",
  "Compliance",
  "Human Resources",
  "Facilities",
  "Events",
  "Community Programs",
  "Support Services",
] as const;

export const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Japanese",
  "Korean",
  "Arabic",
  "Portuguese",
  "Hindi",
  "Dutch",
  "Italian",
  "Russian",
  "Swedish",
  "Thai",
  "Tagalog",
] as const;

export const ALL_LANGUAGES = [
  "Afrikaans",
  "Albanian",
  "Amharic",
  "Arabic",
  "Armenian",
  "Assamese",
  "Azerbaijani",
  "Basque",
  "Belarusian",
  "Bengali",
  "Bosnian",
  "Bulgarian",
  "Burmese",
  "Cantonese",
  "Catalan",
  "Cebuano",
  "Croatian",
  "Czech",
  "Danish",
  "Dutch",
  "English",
  "Estonian",
  "Farsi",
  "Finnish",
  "French",
  "Galician",
  "Georgian",
  "German",
  "Greek",
  "Gujarati",
  "Haitian Creole",
  "Hausa",
  "Hebrew",
  "Hindi",
  "Hmong",
  "Hungarian",
  "Icelandic",
  "Igbo",
  "Indonesian",
  "Irish",
  "Italian",
  "Japanese",
  "Javanese",
  "Kannada",
  "Kazakh",
  "Khmer",
  "Kinyarwanda",
  "Korean",
  "Kurdish",
  "Kyrgyz",
  "Lao",
  "Latvian",
  "Lithuanian",
  "Luxembourgish",
  "Macedonian",
  "Malagasy",
  "Malay",
  "Malayalam",
  "Maltese",
  "Mandarin",
  "Māori",
  "Marathi",
  "Mongolian",
  "Nepali",
  "Norwegian",
  "Odia",
  "Pashto",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Romanian",
  "Russian",
  "Samoan",
  "Serbian",
  "Shona",
  "Sindhi",
  "Sinhala",
  "Slovak",
  "Slovenian",
  "Somali",
  "Spanish",
  "Sundanese",
  "Swahili",
  "Swedish",
  "Tagalog",
  "Tajik",
  "Tamil",
  "Tatar",
  "Telugu",
  "Thai",
  "Tibetan",
  "Tigrinya",
  "Tongan",
  "Turkish",
  "Turkmen",
  "Twi",
  "Ukrainian",
  "Urdu",
  "Uzbek",
  "Vietnamese",
  "Welsh",
  "Wolof",
  "Xhosa",
  "Yiddish",
  "Yoruba",
  "Zulu",
] as const;

export const APPLICATION_STATUS = [
  "draft",
  "submitted",
  "awaiting_background_check",
  "background_check_in_progress",
  "awaiting_references",
  "references_in_progress",
  "ready_for_interview",
  "interview_scheduled",
  "interview_completed",
  "approved_pending_subscription",
  "active_member",
  "denied",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  awaiting_background_check: "Awaiting Background Check",
  background_check_in_progress: "Background Check In Progress",
  awaiting_references: "Awaiting References",
  references_in_progress: "References In Progress",
  ready_for_interview: "Ready for Interview",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  approved_pending_subscription: "Approved — Activate Membership",
  active_member: "Active Member",
  denied: "Denied",
  withdrawn: "Withdrawn",
};

export const SUB_STATUS_VALUES = [
  "not_started",
  "pending",
  "in_progress",
  "completed",
  "failed",
  "waived",
] as const;
export type SubStatus = (typeof SUB_STATUS_VALUES)[number];

export interface StatusTransitionResult {
  success: boolean;
  application?: unknown;
  error?: string;
  statusCode?: number;
  allowedTransitions?: string[];
}

export interface SubmitApplicationResult {
  success: boolean;
  application?: unknown;
  error?: string;
  statusCode?: number;
}

export interface PaymentSessionResult {
  url: string | null;
  error?: string;
}

export interface PaymentConfirmationResult {
  paid: boolean;
  application?: unknown;
}
