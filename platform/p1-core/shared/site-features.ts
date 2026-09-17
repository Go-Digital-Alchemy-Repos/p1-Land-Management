export interface SiteFeatures {
  cmsEnabled: boolean;
  blogEnabled: boolean;
  eventsEnabled: boolean;
  crmEnabled: boolean;
  careersEnabled: boolean;
}

export const DEFAULT_SITE_FEATURES: SiteFeatures = {
  cmsEnabled: true,
  blogEnabled: true,
  eventsEnabled: false,
  crmEnabled: true,
  careersEnabled: false,
};

export function normalizeBooleanSetting(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "off", "disabled"].includes(normalized)) return false;
  }
  return fallback;
}

export const SITE_FEATURE_SETTING_KEYS: Record<keyof SiteFeatures, string> = {
  cmsEnabled: "enable_cms",
  blogEnabled: "enable_blog",
  eventsEnabled: "enable_events",
  crmEnabled: "enable_crm",
  careersEnabled: "enable_careers",
};
export function parseSiteFeatures(settings: Record<string, unknown>): SiteFeatures {
  return Object.fromEntries(
    Object.entries(SITE_FEATURE_SETTING_KEYS).map(([feature, key]) => [
      feature,
      normalizeBooleanSetting(settings[key], DEFAULT_SITE_FEATURES[feature as keyof SiteFeatures]),
    ]),
  ) as unknown as SiteFeatures;
}
