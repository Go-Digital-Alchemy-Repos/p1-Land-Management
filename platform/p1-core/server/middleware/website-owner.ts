import { SITE_FEATURE_SETTING_KEYS } from "@shared/site-features";
import type { Request, RequestHandler } from "express";
export function isWebsiteOwner(req: Request) {
  const identity = req.dashboardIdentity;
  return Boolean(
    req.user && identity?.active && identity.role === "owner" && identity.ownerAttested,
  );
}
export const requireWebsiteOwner: RequestHandler = (req, res, next) => {
  if (!isWebsiteOwner(req)) {
    res.status(403).json({ message: "Owner access required" });
    return;
  }
  res.setHeader("Cache-Control", "private, no-store");
  next();
};

export function websiteSettingScope(
  key: unknown,
  category?: unknown,
): "head-tags" | "features" | null {
  if (key === "public_head_html") return "head-tags";
  if (Object.values(SITE_FEATURE_SETTING_KEYS).includes(key as string)) return "features";
  if (category === "head_tag_additions") return "head-tags";
  if (category === "system_configuration") return "features";
  return null;
}
