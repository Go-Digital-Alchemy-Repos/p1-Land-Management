import privateProofRoutes from "./p1-private-proof.routes";
import { Router } from "express";
import { authenticateToken, requireAdminPermission, requireRole } from "../../middleware/auth";
import dashboardRoutes from "./dashboard.routes";
import usersRoutes from "./users.routes";
import eventsRoutes from "./events.routes";
import blogRoutes from "./blog.routes";
import registrationRoutes from "./registrations.routes";
import cmsRoutes from "./cms.routes";
import cmsMediaRoutes from "./cms-media.routes";
import cmsSectionsRoutes from "./cms-sections.routes";
import teamRoutes from "./team.routes";
import cmsGalleriesRoutes from "./cms-galleries.routes";
import cmsSeoRoutes from "./cms-seo.routes";
import cmsRedirectsRoutes from "./cms-redirects.routes";
import cmsAuditRoutes from "./cms-audit.routes";
import cmsMenusRoutes from "./cms-menus.routes";
import cmsSidebarsRoutes from "./cms-sidebars.routes";
import systemBackupsRoutes from "./system-backups.routes";
import formsRoutes from "./forms.routes";
import editorLocksRoutes from "./editor-locks.routes";
import crmRoutes from "./crm.routes";
import careersRoutes from "./careers.routes";
import clientSiteContentRoutes from "./client-site-content.routes";
import clientStackOnboardingRoutes from "./client-stack-onboarding.routes";
import {
  requireBlogEnabled,
  requireCareersEnabled,
  requireCmsEnabled,
  requireCrmEnabled,
  requireEventsEnabled,
} from "../../middleware/site-features";

const router = Router();

router.use(authenticateToken);

router.use(
  "/cms/private-proof",
  requireCmsEnabled,
  requireAdminPermission("content"),
  privateProofRoutes,
);

// CRM editors must reach their scoped router before the admin-only root mounts.
router.use("/crm", requireCrmEnabled, requireAdminPermission("crm"), crmRoutes);

// Content editors need the same scoped access before the admin-only root mounts.
router.use(
  "/client-site-content",
  requireCmsEnabled,
  requireAdminPermission("content"),
  clientSiteContentRoutes,
);

router.use(
  ["/dashboard-stats", "/dashboard-analytics", "/activity", "/contact-messages"],
  requireRole("admin"),
);
router.use("/", dashboardRoutes);

router.use("/users", requireRole("admin"), usersRoutes);

router.use("/events", requireEventsEnabled, requireAdminPermission("content"), eventsRoutes);
router.use("/blog", requireBlogEnabled, requireAdminPermission("content"), blogRoutes);
router.use("/", registrationRoutes);
router.use("/cms", requireCmsEnabled, cmsRoutes);
router.use("/client-stack-onboarding", requireRole("admin"), clientStackOnboardingRoutes);
router.use("/cms", requireCmsEnabled, cmsMediaRoutes);
router.use("/cms", requireCmsEnabled, cmsSectionsRoutes);
router.use("/cms", requireCmsEnabled, cmsGalleriesRoutes);
router.use("/cms", requireCmsEnabled, teamRoutes);
router.use("/cms", requireCmsEnabled, cmsSeoRoutes);
router.use("/cms", requireCmsEnabled, cmsRedirectsRoutes);
router.use("/cms", requireCmsEnabled, cmsAuditRoutes);
router.use("/cms", requireCmsEnabled, cmsMenusRoutes);
router.use("/cms", requireCmsEnabled, cmsSidebarsRoutes);
router.use(["/forms", "/form-delivery-jobs"], requireAdminPermission("content"));
router.use("/", formsRoutes);

router.use("/careers", requireCareersEnabled, requireAdminPermission("content"), careersRoutes);

router.use("/editor-locks", requireRole("admin", "editor"), editorLocksRoutes);
router.use("/", systemBackupsRoutes);

export default router;
