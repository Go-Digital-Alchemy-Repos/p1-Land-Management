export const DIRECTORY_MODES = ["service_provider", "store_locator"] as const;

export type DirectoryMode = (typeof DIRECTORY_MODES)[number];

export const LEGACY_DIRECTORY_MODES = [
  "therapists",
  "locations",
  "service_providers",
  "real_estate",
  "custom",
] as const;

export type LegacyDirectoryMode = (typeof LEGACY_DIRECTORY_MODES)[number];
export type DirectoryModeInput = DirectoryMode | LegacyDirectoryMode;

export const DIRECTORY_MODE_ALIASES: Record<DirectoryModeInput, DirectoryMode> = {
  service_provider: "service_provider",
  store_locator: "store_locator",
  therapists: "service_provider",
  service_providers: "service_provider",
  custom: "service_provider",
  locations: "store_locator",
  real_estate: "store_locator",
};

export const DIRECTORY_MODE_PROFILE_ALIASES: Record<DirectoryMode, string[]> = {
  service_provider: ["service_provider", "service_providers", "therapists", "custom"],
  store_locator: ["store_locator", "locations", "real_estate"],
};

export function normalizeDirectoryMode(value: string | null | undefined): DirectoryMode {
  if (!value) return "service_provider";
  return DIRECTORY_MODE_ALIASES[value as DirectoryModeInput] ?? "service_provider";
}

export const DIRECTORY_PRIMARY_CTA_TYPES = [
  "contact_form",
  "website",
  "phone",
  "directions",
  "none",
] as const;

export type DirectoryPrimaryCtaType = (typeof DIRECTORY_PRIMARY_CTA_TYPES)[number];

export type DirectoryLabelPreset = {
  templateLabel: string;
  templateDescription: string;
  directoryLabelSingular: string;
  directoryLabelPlural: string;
  listingLabelSingular: string;
  listingLabelPlural: string;
  participantLabelSingular: string;
  participantLabelPlural: string;
  specialtyLabelPlural: string;
  profileTitleLabel: string;
  profileTitlePlaceholder: string;
  profileBioLabel: string;
  profileBioPlaceholder: string;
  credentialsLabel: string;
  credentialsPlaceholder: string;
  licenseNumberLabel: string;
  licenseNumberPlaceholder: string;
  practiceDetailsLabel: string;
  practiceModeLabel: string;
  acceptingClientsLabel: string;
  acceptingClientsHelpText: string;
  willingToTravelLabel: string;
  willingToTravelHelpText: string;
  locationContactLabel: string;
  primaryCtaType: DirectoryPrimaryCtaType;
  primaryCtaLabel: string;
  showProfileTitle: boolean;
  requireProfileTitle: boolean;
  showProfileBio: boolean;
  requireProfileBio: boolean;
  showSpecialties: boolean;
  requireSpecialties: boolean;
  showLanguages: boolean;
  requireLanguages: boolean;
  showCredentials: boolean;
  requireCredentials: boolean;
  showLicenseNumber: boolean;
  requireLicenseNumber: boolean;
  showPracticeMode: boolean;
  requirePracticeMode: boolean;
  showAvailabilityStatus: boolean;
  showTravelOption: boolean;
  showLocationFields: boolean;
  requireLocationFields: boolean;
  showPhone: boolean;
  requirePhone: boolean;
  showWebsite: boolean;
  requireWebsite: boolean;
  showSocialLinks: boolean;
  showGallery: boolean;
  requireGallery: boolean;
  galleryLabel: string;
  galleryHelpText: string;
  galleryMinImages: number;
  galleryMaxImages: number;
  structuredDataType:
    | "Person"
    | "LocalBusiness"
    | "ProfessionalService"
    | "RealEstateListing"
    | "Thing";
  recommendedLayouts: string[];
  recommendedFilters: string[];
  trustSignals: string[];
};

export const DIRECTORY_LABEL_PRESETS: Record<DirectoryMode, DirectoryLabelPreset> = {
  service_provider: {
    templateLabel: "Service Provider Directory",
    templateDescription:
      "For people and professional practices such as therapists, coaches, consultants, clinicians, instructors, advisors, vendors, or agencies.",
    directoryLabelSingular: "Provider Directory",
    directoryLabelPlural: "Service Providers",
    listingLabelSingular: "Profile",
    listingLabelPlural: "Profiles",
    participantLabelSingular: "Service Provider",
    participantLabelPlural: "Service Providers",
    specialtyLabelPlural: "Services",
    profileTitleLabel: "Professional Title",
    profileTitlePlaceholder: "e.g. Certified Strategy Consultant",
    profileBioLabel: "Bio",
    profileBioPlaceholder: "Tell visitors about your background, services, and approach...",
    credentialsLabel: "Credentials",
    credentialsPlaceholder: "e.g. PhD, LMFT, PMP, Certified Coach",
    licenseNumberLabel: "License or Certification Number",
    licenseNumberPlaceholder: "e.g. LIC-12345",
    practiceDetailsLabel: "Practice Details",
    practiceModeLabel: "Service Format",
    acceptingClientsLabel: "Accepting New Customers",
    acceptingClientsHelpText: "Toggle whether you are currently accepting new customers",
    willingToTravelLabel: "Willing to Travel",
    willingToTravelHelpText: "Toggle whether you provide services at customer locations",
    locationContactLabel: "Location & Contact",
    primaryCtaType: "contact_form",
    primaryCtaLabel: "Request Information",
    showProfileTitle: true,
    requireProfileTitle: false,
    showProfileBio: true,
    requireProfileBio: false,
    showSpecialties: true,
    requireSpecialties: false,
    showLanguages: true,
    requireLanguages: false,
    showCredentials: true,
    requireCredentials: false,
    showLicenseNumber: true,
    requireLicenseNumber: false,
    showPracticeMode: true,
    requirePracticeMode: false,
    showAvailabilityStatus: true,
    showTravelOption: true,
    showLocationFields: true,
    requireLocationFields: false,
    showPhone: true,
    requirePhone: false,
    showWebsite: true,
    requireWebsite: false,
    showSocialLinks: true,
    showGallery: false,
    requireGallery: false,
    galleryLabel: "Photo Gallery",
    galleryHelpText:
      "Add optional photos that help visitors understand your practice, service, or professional presence.",
    galleryMinImages: 0,
    galleryMaxImages: 8,
    structuredDataType: "ProfessionalService",
    recommendedLayouts: ["Compact list", "Profile cards", "Map/list split", "Detail profile"],
    recommendedFilters: [
      "Search",
      "Specializations",
      "Languages",
      "Location",
      "Session format",
      "Availability",
    ],
    trustSignals: [
      "Verified credentials",
      "Approved listing",
      "Accepting new clients",
      "Featured profile",
    ],
  },
  store_locator: {
    templateLabel: "Store Locator",
    templateDescription:
      "For physical locations such as stores, clinics, offices, showrooms, venues, campuses, branches, or service areas.",
    directoryLabelSingular: "Store Locator",
    directoryLabelPlural: "Locations",
    listingLabelSingular: "Location",
    listingLabelPlural: "Locations",
    participantLabelSingular: "Location Manager",
    participantLabelPlural: "Location Managers",
    specialtyLabelPlural: "Categories",
    profileTitleLabel: "Location Name",
    profileTitlePlaceholder: "e.g. Downtown Flagship Store",
    profileBioLabel: "Business Description",
    profileBioPlaceholder:
      "Describe this location, services, amenities, and what visitors can expect...",
    credentialsLabel: "Amenities & Attributes",
    credentialsPlaceholder: "e.g. Curbside pickup, wheelchair accessible, showroom, repairs",
    licenseNumberLabel: "Store or Location ID",
    licenseNumberPlaceholder: "e.g. STORE-1024",
    practiceDetailsLabel: "Business Details",
    practiceModeLabel: "Visit Type",
    acceptingClientsLabel: "Open to Customers",
    acceptingClientsHelpText:
      "Toggle whether this location is currently open to new visitors or customers",
    willingToTravelLabel: "Service Area Available",
    willingToTravelHelpText: "Toggle whether this location or team can travel to customers",
    locationContactLabel: "Address & Contact",
    primaryCtaType: "directions",
    primaryCtaLabel: "Get Directions",
    showProfileTitle: true,
    requireProfileTitle: false,
    showProfileBio: true,
    requireProfileBio: false,
    showSpecialties: true,
    requireSpecialties: false,
    showLanguages: false,
    requireLanguages: false,
    showCredentials: true,
    requireCredentials: false,
    showLicenseNumber: true,
    requireLicenseNumber: false,
    showPracticeMode: true,
    requirePracticeMode: false,
    showAvailabilityStatus: true,
    showTravelOption: true,
    showLocationFields: true,
    requireLocationFields: false,
    showPhone: true,
    requirePhone: false,
    showWebsite: true,
    requireWebsite: false,
    showSocialLinks: true,
    showGallery: true,
    requireGallery: false,
    galleryLabel: "Location Photos",
    galleryHelpText:
      "Show storefront, interior, amenities, exterior, and arrival photos so visitors know what to expect.",
    galleryMinImages: 0,
    galleryMaxImages: 16,
    structuredDataType: "LocalBusiness",
    recommendedLayouts: ["Map/list split", "Card grid", "Detail profile"],
    recommendedFilters: [
      "Search",
      "Services",
      "Location",
      "Service format",
      "Open/accepting visitors",
    ],
    trustSignals: [
      "Verified location",
      "Active listing",
      "Accepting visitors",
      "Featured location",
    ],
  },
};

export type PublicDirectorySettings = DirectoryLabelPreset & {
  directoryMode: DirectoryMode;
  applicationFeeAmountCents: number;
  applicationFeeNoticeTitle: string;
  applicationFeeNoticeBody: string;
  applicationFeePolicySummary: string;
  applicationFeeCreditOnApproval: boolean;
  applicationFeeCreditAmountCents: number;
  renewalReminderDays: number;
  paymentFailureGraceHours: number;
  suspendListingOnPastDue: boolean;
  directoryRequiresApplicationProcess: boolean;
  directoryRequiresApprovedApplication: boolean;
  directoryRequiresActiveSubscription: boolean;
  directoryShowLocationJobs: boolean;
};

function normalizedLabel(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

export function getDirectoryExperienceMode(
  settings: Pick<
    PublicDirectorySettings,
    | "directoryMode"
    | "directoryLabelPlural"
    | "listingLabelPlural"
    | "participantLabelPlural"
    | "specialtyLabelPlural"
  >,
): DirectoryMode {
  const canonicalMode = normalizeDirectoryMode(settings.directoryMode);
  const directoryPlural = normalizedLabel(settings.directoryLabelPlural);
  const listingPlural = normalizedLabel(settings.listingLabelPlural);
  const participantPlural = normalizedLabel(settings.participantLabelPlural);
  const specialtyPlural = normalizedLabel(settings.specialtyLabelPlural);

  if (
    canonicalMode === "store_locator" ||
    participantPlural.includes("listing agent") ||
    directoryPlural.includes("location") ||
    listingPlural.includes("location") ||
    listingPlural.includes("property") ||
    specialtyPlural.includes("property")
  ) {
    return "store_locator";
  }

  return "service_provider";
}
