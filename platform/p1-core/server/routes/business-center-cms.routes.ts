import websiteSystem from "./business-center-website-system.routes";
import careers from "./admin/careers.routes";
import { requireBusinessCapability } from "../middleware/auth";
import eventAttendees from "./business-center-event-attendees.routes";
import events from "./admin/events.routes";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  authenticateMarketingService,
  resolveMarketingActor,
} from "../middleware/marketing-service";
import {
  requireCmsEnabled,
  requireBlogEnabled,
  requireEventsEnabled,
  requireCareersEnabled,
} from "../middleware/site-features";
import { FederationError } from "../services/federation-client";
import forms from "./admin/forms.routes";
import pages from "./admin/cms.routes";
import sections from "./admin/cms-sections.routes";
import galleries from "./admin/cms-galleries.routes";
import menus from "./admin/cms-menus.routes";
import sidebars from "./admin/cms-sidebars.routes";
import seo from "./admin/cms-seo.routes";
import redirects from "./admin/cms-redirects.routes";
import audit from "./admin/cms-audit.routes";
import team from "./admin/team.routes";
import editorLocks from "./admin/editor-locks.routes";
import blog from "./admin/blog.routes";
import media from "./admin/cms-media.routes";
import website from "./admin/client-site-content.routes";

/** Retained CMS handlers, with their canonical tool gates, own validation and writes.
 * No arbitrary Core URL, local cookie, role or client-supplied identity is accepted.
 * Media retains its bounded multipart parser and source-file handler.
 */
const router = Router();
router.use(authenticateMarketingService);
router.use(async (req, res, next) => {
  const grant = z.string().uuid().safeParse(req.get("x-p1-user-grant"));
  if (!grant.success) {
    res.status(400).json({ message: "Invalid user grant" });
    return;
  }
  try {
    const context = await resolveMarketingActor(grant.data);
    req.user = context.user;
    req.dashboardIdentity = context.identity;
    next();
  } catch (error) {
    res
      .status(error instanceof FederationError ? error.status : 503)
      .json({ message: "Website access unavailable" });
  }
});
router.get("/notification-forms", async (req, res, next) => {
  const identity = req.dashboardIdentity;
  if (!identity?.active || identity.role !== "owner" || !identity.ownerAttested) {
    res.status(403).json({ message: "Owner access required" });
    return;
  }
  try {
    const forms = await storage.forms.getAll();
    res.json({
      items: forms.map(({ id, name, slug, isActive, isSystem }) => ({
        id,
        name,
        slug,
        isActive,
        isSystem,
      })),
    });
  } catch (error) {
    next(error);
  }
});
router.use("/website-system", websiteSystem);
router.use("/editor-locks", editorLocks);
router.use("/blog", requireBlogEnabled, blog);
router.use(eventAttendees);
router.use("/events", requireEventsEnabled, events);
router.use(
  "/careers",
  requireCareersEnabled,
  (req, res, next) => {
    if (/^\/settings\/?$/i.test(req.path)) {
      const identity = req.dashboardIdentity;
      if (!identity?.active || identity.role !== "owner" || !identity.ownerAttested) {
        res.status(403).json({ message: "Owner access required" });
        return;
      }
      next();
      return;
    }
    requireBusinessCapability("marketing.content.careers")(req, res, next);
  },
  careers,
);
router.use(requireCmsEnabled);
router.use("/website", website);
router.use(forms, pages, sections, galleries, menus, sidebars, seo, redirects, audit, team, media);
router.use((_req, res) => res.status(404).json({ message: "CMS operation not found" }));
export default router;
