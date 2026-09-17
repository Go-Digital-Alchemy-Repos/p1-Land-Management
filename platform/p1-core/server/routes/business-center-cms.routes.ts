import { Router } from "express";
import { z } from "zod";
import {
  authenticateMarketingService,
  resolveMarketingActor,
} from "../middleware/marketing-service";
import { requireCmsEnabled } from "../middleware/site-features";
import { FederationError } from "../services/federation-client";
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
import website from "./admin/client-site-content.routes";

/** Retained CMS handlers, with their canonical tool gates, own validation and writes.
 * No arbitrary Core URL, local cookie, role or client-supplied identity is accepted.
 * Media's multipart/binary operations have a separate transport and are not mounted here.
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
router.use("/editor-locks", editorLocks);
router.use(requireCmsEnabled);
router.use("/website", website);
router.use(pages, sections, galleries, menus, sidebars, seo, redirects, audit, team);
router.use((_req, res) => res.status(404).json({ message: "CMS operation not found" }));
export default router;
