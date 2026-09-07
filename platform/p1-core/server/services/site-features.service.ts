import {
  DEFAULT_SITE_FEATURES,
  normalizeBooleanSetting,
  type SiteFeatures,
} from "@shared/site-features";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";

export async function getSiteFeatures(): Promise<SiteFeatures> {
  try {
    const settings = await storage.settings.getDecryptedCategory("system_configuration");
    return {
      cmsEnabled: normalizeBooleanSetting(settings.enable_cms, DEFAULT_SITE_FEATURES.cmsEnabled),
      directoryEnabled: false,
      blogEnabled: normalizeBooleanSetting(settings.enable_blog, DEFAULT_SITE_FEATURES.blogEnabled),
      eventsEnabled: normalizeBooleanSetting(
        settings.enable_events,
        DEFAULT_SITE_FEATURES.eventsEnabled,
      ),
      crmEnabled: normalizeBooleanSetting(settings.enable_crm, DEFAULT_SITE_FEATURES.crmEnabled),
      ecommerceEnabled: false,
      membershipEnabled: false,
      careersEnabled: normalizeBooleanSetting(
        settings.enable_careers,
        DEFAULT_SITE_FEATURES.careersEnabled,
      ),
      portfolioEnabled: false,
    };
  } catch (err) {
    logger.app.warn("Failed to retrieve system configuration, returning defaults", {
      error: err instanceof Error ? err.message : String(err),
    });
    return DEFAULT_SITE_FEATURES;
  }
}

export async function isSiteFeatureEnabled(feature: keyof SiteFeatures): Promise<boolean> {
  const features = await getSiteFeatures();
  return features[feature];
}
