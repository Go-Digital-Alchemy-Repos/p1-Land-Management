import { DEFAULT_SITE_FEATURES, parseSiteFeatures, type SiteFeatures } from "@shared/site-features";
import { storage } from "../storage/index";
import { logger } from "../utils/logger";

export async function getSiteFeatures(): Promise<SiteFeatures> {
  try {
    const settings = await storage.settings.getDecryptedCategory("system_configuration");
    return parseSiteFeatures(settings);
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
