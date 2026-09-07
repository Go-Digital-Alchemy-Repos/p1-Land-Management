import p1AnalyticsRoutes from "./p1-analytics.routes";
import type { Express, Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import federationRoutes from "./federation.routes";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin/index";
import settingsRoutes from "./settings.routes";
import eventsRoutes from "./events.routes";
import contactRoutes from "./contact.routes";
import docsRoutes from "./docs.routes";
import uploadRoutes from "./upload.routes";
import notificationsRoutes from "./notifications.routes";
import blogRoutes from "./blog.routes";
import registrationRoutes from "./registration.routes";
import guestRegistrationRoutes from "./guest-registration.routes";
import cmsPublicRoutes from "./cms-public.routes";
import r2PublicRoutes from "./r2-public.routes";
import setupRoutes from "./setup.routes";
import formsRoutes from "./forms.routes";
import crmRoutes from "./crm.routes";
import careersRoutes from "./careers.routes";
import clientSiteContentRoutes from "./client-site-content.routes";
import clientFormsRoutes from "./client-forms.routes";
import {
  requireBlogEnabled,
  requireCareersEnabled,
  requireCmsEnabled,
  requireCrmEnabled,
  requireEventsEnabled,
} from "../middleware/site-features";
import { buildRobotsTxtPayload } from "../services/robots-txt.service";
import { storage } from "../storage/index";
import { getSiteFeatures } from "../services/site-features.service";
import { getSocialMediaLinks, normalizeSocialIconStyle } from "@shared/social-media";

export function registerApiRoutes(app: Express) {
  app.use(
    /^\/api\/(?:admin\/)?(?:ecommerce|membership|membership-tiers|directory|directory-settings|therapists?|stripe|portfolio|applications|reference|specializations|contact-professional)(?=\/|$)/,
    (_req, res) => {
      res.status(404).json({ message: "Not found" });
    },
  );
  app.use("/api/p1", p1AnalyticsRoutes);
  app.use("/r2", r2PublicRoutes);
  app.use("/api/auth/federation", federationRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin", settingsRoutes);
  app.use("/api/events", requireEventsEnabled, eventsRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/forms", formsRoutes);
  app.use("/api/crm", requireCrmEnabled, crmRoutes);
  app.use("/api/careers", requireCareersEnabled, careersRoutes);
  app.use("/api/admin/docs", docsRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/blog", requireBlogEnabled, blogRoutes);
  app.use("/api/events", requireEventsEnabled, guestRegistrationRoutes);
  app.use("/api/events", requireEventsEnabled, registrationRoutes);
  app.use("/api/cms", requireCmsEnabled, cmsPublicRoutes);
  app.use("/api/client-site-content", requireCmsEnabled, clientSiteContentRoutes);
  app.use("/api/client-forms", clientFormsRoutes);
  app.use("/api/setup", setupRoutes);

  app.get("/api/branding", async (_req, res) => {
    try {
      const branding = await storage.settings.getDecryptedCategory("branding");
      res.json({
        frontendLogoUrl: branding.frontend_logo_url || null,
        faviconUrl: branding.favicon_url || null,
        companyName: branding.company_name || null,
        companyAddress: branding.company_address || null,
        companyPhoneNumbers: branding.company_phone_numbers || null,
        companyGoogleBusinessUrl: branding.company_google_business_url || null,
        socialLinks: getSocialMediaLinks(branding),
        socialIconStyle: normalizeSocialIconStyle(branding.social_icon_style),
        bodyFont: branding.frontend_body_font || null,
        headingFont: branding.frontend_heading_font || null,
        primaryColor: branding.brand_primary_color || null,
        secondaryColor: branding.brand_secondary_color || null,
        tertiaryColor: branding.brand_tertiary_color || null,
        quaternaryColor: branding.brand_quaternary_color || "#A8623A",
        h1Color: branding.text_h1_color || null,
        h2Color: branding.text_h2_color || null,
        h3ToH6Color: branding.text_h3_h6_color || null,
        bodyTextColor: branding.text_body_color || null,
        headingSubtextColor:
          branding.text_heading_subtext_color || branding.text_muted_color || null,
        supportingCopyColor:
          branding.text_supporting_copy_color || branding.text_muted_color || null,
        helperTextColor: branding.text_helper_text_color || branding.text_muted_color || null,
        metaTextColor: branding.text_meta_color || null,
        linkColor: branding.text_link_color || null,
        linkHoverColor: branding.text_link_hover_color || null,
        inverseTextColor: branding.text_inverse_color || null,
        primaryTextColor: branding.text_primary_foreground_color || null,
        secondaryTextColor: branding.text_secondary_foreground_color || null,
        tertiaryTextColor: branding.text_tertiary_foreground_color || null,
      });
    } catch (err) {
      logger.app.warn("Failed to retrieve branding settings, returning defaults", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.json({
        frontendLogoUrl: null,
        faviconUrl: null,
        companyName: null,
        companyAddress: null,
        companyPhoneNumbers: null,
        companyGoogleBusinessUrl: null,
        socialLinks: [],
        socialIconStyle: "brand",
        bodyFont: null,
        headingFont: null,
        primaryColor: null,
        secondaryColor: null,
        tertiaryColor: null,
        quaternaryColor: "#A8623A",
        h1Color: null,
        h2Color: null,
        h3ToH6Color: null,
        bodyTextColor: null,
        headingSubtextColor: null,
        supportingCopyColor: null,
        helperTextColor: null,
        metaTextColor: null,
        linkColor: null,
        linkHoverColor: null,
        inverseTextColor: null,
        primaryTextColor: null,
        secondaryTextColor: null,
        tertiaryTextColor: null,
      });
    }
  });

  app.get("/api/site-config", async (_req, res) => {
    res.json(await getSiteFeatures());
  });

  app.get("/api/runtime-integrations", async (_req, res) => {
    try {
      const analytics = await storage.settings.getDecryptedCategory("google_analytics");
      const metaAds = await storage.settings.getDecryptedCategory("meta_ads");
      const tiktokAds = await storage.settings.getDecryptedCategory("tiktok_ads");
      const xAds = await storage.settings.getDecryptedCategory("x_ads");

      res.json({
        ga4MeasurementId: analytics.ga4_measurement_id || null,
        metaPixelId: metaAds.meta_pixel_id || null,
        tiktokPixelId: tiktokAds.tiktok_pixel_id || null,
        xPixelId: xAds.x_pixel_id || null,
      });
    } catch (err) {
      logger.app.warn("Failed to retrieve runtime integrations, returning defaults", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.json({
        ga4MeasurementId: null,
        metaPixelId: null,
        tiktokPixelId: null,
        xPixelId: null,
      });
    }
  });

  app.get("/api/seo/global", async (_req, res) => {
    const settings = await storage.seoSettings.get();
    res.json(settings ?? {});
  });

  app.get("/robots.txt", async (_req, res) => {
    try {
      const seoSettings = await storage.seoSettings.get();
      const { effectiveContent } = buildRobotsTxtPayload(seoSettings);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(effectiveContent);
    } catch {
      res.status(500).send("Error generating robots.txt");
    }
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    try {
      const redirect = await storage.redirects.getActiveForPath(req.path);
      if (redirect) {
        return res.redirect(redirect.statusCode, redirect.toPath);
      }
    } catch (err) {
      logger.app.warn("Failed to look up redirect", {
        path: req.path,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    next();
  });
}
