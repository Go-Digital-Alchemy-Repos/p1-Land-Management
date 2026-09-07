import { sanitizeTeamBiography } from "../utils/team-biography";
import { Router } from "express";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
import { paramString } from "../utils/params";
import { PUBLIC_MENU_LOCATIONS, type CmsMenu, type PublicMenuLocation } from "@shared/schema";
import { verifyCmsPreviewToken } from "../utils/cms-preview-token";
import { optionalAuth, authenticateToken, requireAdminPermission } from "../middleware/auth";
import { sanitizePublicCmsContent } from "../utils/sanitize-rich-html";

const router = Router();

router.get(
  "/team",
  asyncHandler(async (_req, res) => {
    const members = await storage.team.published();
    res.json(
      members.map((member) => ({
        ...member,
        biography: sanitizeTeamBiography(member.biography),
      })),
    );
  }),
);

router.get(
  "/pages/by-slug/:slug",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const slug = paramString(req.params.slug);
    const page = await storage.cmsPages.getPageBySlug(slug);
    if (!page || page.status !== "published") {
      return res.status(404).json({ error: "Page not found" });
    }

    res.json({ ...page, content: sanitizePublicCmsContent(page.content) });
  }),
);

router.get(
  "/pages/preview/:id",
  authenticateToken,
  requireAdminPermission("content"),
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const token = typeof req.query.token === "string" ? req.query.token : null;
    const page = await storage.cmsPages.getPage(id);

    if (!page || !verifyCmsPreviewToken(page, token)) {
      return res.status(404).json({ error: "Preview not found" });
    }

    res.json({ ...page, content: sanitizePublicCmsContent(page.content) });
  }),
);

router.get(
  "/galleries/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const gallery = await storage.cmsGalleries.getPublishedByIdOrSlug(id);
    if (!gallery) {
      return res.status(404).json({ error: "Gallery not found" });
    }
    res.json(gallery);
  }),
);

router.get(
  "/sidebars/default",
  asyncHandler(async (_req, res) => {
    const sidebar = await storage.cmsSidebars.getDefault();
    if (!sidebar) {
      return res.status(404).json({ error: "No default sidebar configured" });
    }
    res.json(sanitizePublicCmsContent(sidebar));
  }),
);

router.get(
  "/sidebars/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const sidebar = await storage.cmsSidebars.getById(id);
    if (!sidebar) {
      return res.status(404).json({ error: "Sidebar not found" });
    }
    res.json(sanitizePublicCmsContent(sidebar));
  }),
);

router.get(
  "/menus",
  asyncHandler(async (_req, res) => {
    const menus = await storage.cmsMenus.getAll();
    const menuMap: Partial<Record<PublicMenuLocation, CmsMenu>> = {};
    for (const menu of menus) {
      const location = menu.location as PublicMenuLocation;
      if (!PUBLIC_MENU_LOCATIONS.includes(location) || menuMap[location]) {
        continue;
      }
      menuMap[location] = menu;
    }
    res.json(menuMap);
  }),
);

router.get(
  "/menus/:location",
  asyncHandler(async (req, res) => {
    const location = paramString(req.params.location);
    if (!PUBLIC_MENU_LOCATIONS.includes(location as PublicMenuLocation)) {
      return res.status(400).json({ error: "Invalid menu location" });
    }
    const menu = await storage.cmsMenus.getByLocation(location);
    if (!menu) {
      return res.status(404).json({ error: "No menu configured for this location" });
    }
    res.json(menu);
  }),
);

export default router;
