import type { RequestHandler } from "express";
import type { SiteFeatures } from "@shared/site-features";
import { isSiteFeatureEnabled } from "../services/site-features.service";

export function requireSiteFeature(feature: keyof SiteFeatures, label: string): RequestHandler {
  return async (_req, res, next) => {
    try {
      const enabled = await isSiteFeatureEnabled(feature);
      if (!enabled) {
        res.status(404).json({ message: `${label} is not available` });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireCmsEnabled = requireSiteFeature("cmsEnabled", "CMS");
export const requireBlogEnabled = requireSiteFeature("blogEnabled", "Blog");
export const requireEventsEnabled = requireSiteFeature("eventsEnabled", "Events");
export const requireCrmEnabled = requireSiteFeature("crmEnabled", "CRM");
export const requireCareersEnabled = requireSiteFeature("careersEnabled", "Careers");
