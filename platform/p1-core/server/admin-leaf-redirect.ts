import type { RequestHandler } from "express";

// Review-only cutover candidate. Keep this OFF until the separate account, CRM,
// CMS parity, and recovery gates authorize a reversible redirect release.
export const ADMIN_LEAF_REDIRECT_FLAG = "P1_ADMIN_LEAF_REDIRECTS_ENABLED";

const DASHBOARD_ORIGIN = "https://dashboard.p1landmanagement.com";

const ADMIN_LEAF_DESTINATIONS = new Map<string, string>([
  ["/admin/design/branding", "/marketing/design/branding"],
  ["/admin/design/colors", "/marketing/design/colors"],
  ["/admin/design/social-media", "/marketing/design/social-media"],
  ["/admin/design/typography", "/marketing/design/typography"],
  ["/admin/settings/head-tags", "/marketing/system/head-tags"],
  ["/admin/cms/seo", "/marketing/content/seo"],
  ["/admin/cms/menus", "/marketing/content/menus"],
  ["/admin/cms/sidebars", "/marketing/content/sidebars"],
]);

function validatedDashboardOrigin(): string {
  const url = new URL(DASHBOARD_ORIGIN);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "dashboard.p1landmanagement.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid fixed Dashboard redirect origin");
  }
  return url.origin;
}

const dashboardOrigin = validatedDashboardOrigin();

export function adminLeafRedirectsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[ADMIN_LEAF_REDIRECT_FLAG] === "true";
}

export function adminLeafRedirect(enabled = adminLeafRedirectsEnabled()): RequestHandler {
  return (req, res, next) => {
    if (!enabled || (req.method !== "GET" && req.method !== "HEAD")) return next();

    // A fetch for a resource is not a document navigation, even at a UI URL.
    const fetchDestination = req.get("sec-fetch-dest");
    if (fetchDestination && fetchDestination !== "document") return next();

    const destination = ADMIN_LEAF_DESTINATIONS.get(req.path);
    if (!destination) return next();

    // Intentionally discard every legacy query parameter. These leaf pages do
    // not require query context, and arbitrary values may contain credentials.
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Referrer-Policy", "no-referrer");
    return res.redirect(302, `${dashboardOrigin}${destination}`);
  };
}
