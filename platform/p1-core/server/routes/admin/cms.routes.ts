import { getBaseUrl } from "../../utils/route-helpers";
import { requireAdminPermission as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { paramString } from "../../utils/params";
import { insertCmsPageSchema } from "@shared/schema";
import { logger } from "../../utils/logger";
import { createCmsPreviewToken } from "../../utils/cms-preview-token";
import {
  getCmsPageMenuReferences,
  removeCmsPageMenuReferences,
  syncCmsPageRelationships,
} from "../../services/cms-relationships.service";

const router = Router();

const PAGE_TYPES = ["home", "about", "contact", "landing", "custom"] as const;
const STATUSES = ["draft", "published", "scheduled", "archived"] as const;

const createPageSchema = insertCmsPageSchema.extend({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-/]+$/, "Slug must be lowercase with hyphens only")
    .refine(value => !/^(admin|api|assets|uploads|r2|health)(?:\/|$)/.test(value), "This route is reserved"),
  pageType: z.enum(PAGE_TYPES).default("custom"),
  status: z.enum(STATUSES).default("draft"),
});

const updatePageSchema = createPageSchema.partial().extend({
  title: z.string().min(1).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-/]+$/)
    .refine(value => !/^(admin|api|assets|uploads|r2|health)(?:\/|$)/.test(value), "This route is reserved")
    .optional(),
});

function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim().replace(/\s+/g, "-");
}

async function getUniqueCopySlug(slug: string): Promise<string> {
  const baseSlug = normalizeSlug(`${slug.replace(/\/+$/, "")}-copy`);
  let candidate = baseSlug;
  let copyNumber = 2;

  while (await storage.cmsPages.getPageBySlug(candidate)) {
    candidate = `${baseSlug}-${copyNumber}`;
    copyNumber += 1;
  }

  return candidate;
}

async function resolvePage(identifier: string) {
  return storage.cmsPages.getPageByIdOrSlug(identifier);
}

router.get("/pages", p1Authorize("content"), async (req, res) => {
  try {
    const pages = await storage.cmsPages.getAllPages();
    res.json(pages);
  } catch (error) {
    logger.cms.error("Failed to fetch pages", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch CMS pages" });
  }
});

router.post("/pages", p1Authorize("content"), async (req, res) => {
  try {
    const parsed = createPageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }

    const data = parsed.data;
    if (data.status === "scheduled") {
      return res.status(400).json({ error: "Use the /schedule endpoint to schedule a page" });
    }
    const slug = normalizeSlug(data.slug);

    const existing = await storage.cmsPages.getPageBySlug(slug);
    if (existing) {
      return res.status(409).json({ error: "A page with this slug already exists" });
    }

    const adminId = req.user!.id;
    const page = await storage.cmsPages.createPage({
      ...data,
      slug,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await storage.cmsPageRevisions.createRevision({
      pageId: page.id,
      title: page.title,
      content: page.content as Record<string, unknown>,
      status: page.status,
      changedBy: adminId,
      changeNote: "Initial creation",
    });

    res.status(201).json(page);
  } catch (error) {
    logger.cms.error("Failed to create page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to create CMS page" });
  }
});

router.get("/pages/:id", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await resolvePage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    logger.cms.error("Failed to fetch page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch CMS page" });
  }
});

router.get("/pages/:id/relationships", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await resolvePage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const menuReferences = await getCmsPageMenuReferences(page);
    res.json({
      pageId: page.id,
      menuReferences,
      counts: {
        menuItems: menuReferences.length,
      },
    });
  } catch (error) {
    logger.cms.error("Failed to fetch page relationships", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch CMS page relationships" });
  }
});

router.post("/pages/:id/relationships/remove-menu-items", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await resolvePage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const result = await removeCmsPageMenuReferences(page);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.cms.error("Failed to remove page menu references", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to remove CMS page menu references" });
  }
});

router.get("/pages/:id/preview-link", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await resolvePage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const token = createCmsPreviewToken(page);
    const previewPath = `/preview/cms/${page.id}?token=${encodeURIComponent(token)}`;
    const previewUrl = `${getBaseUrl(req)}${previewPath}`;

    res.json({
      token,
      previewPath,
      previewUrl,
      expiresInHours: 168,
      pageId: page.id,
      slug: page.slug,
      status: page.status,
    });
  } catch (error) {
    logger.cms.error("Failed to generate preview link", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to generate preview link" });
  }
});

router.post("/pages/:id/duplicate", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await resolvePage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const adminId = req.user!.id;
    const copyTitle = `${page.title} Copy`;
    const copySlug = await getUniqueCopySlug(page.slug);
    const copyContent =
      page.content == null
        ? {}
        : (JSON.parse(JSON.stringify(page.content)) as Record<string, unknown>);

    const duplicate = await storage.cmsPages.createPage({
      title: copyTitle,
      slug: copySlug,
      status: "draft",
      pageType: page.pageType,
      template: page.template,
      sidebarId: page.sidebarId,
      content: copyContent,
      seoTitle: page.seoTitle ? `${page.seoTitle} Copy` : null,
      seoDescription: page.seoDescription,
      seoKeywords: page.seoKeywords,
      ogImageUrl: page.ogImageUrl,
      canonicalUrl: null,
      noindex: page.noindex,
      createdBy: adminId,
      updatedBy: adminId,
      scheduledAt: null,
      publishedAt: null,
    });

    await storage.cmsPageRevisions.createRevision({
      pageId: duplicate.id,
      title: duplicate.title,
      content: duplicate.content as Record<string, unknown>,
      status: duplicate.status,
      changedBy: adminId,
      changeNote: `Duplicated from ${page.title}`,
    });

    res.status(201).json(duplicate);
  } catch (error) {
    logger.cms.error("Failed to duplicate page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to duplicate CMS page" });
  }
});

router.put("/pages/:id", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await resolvePage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const parsed = updatePageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }

    const data = parsed.data;
    if (data.status === "scheduled" && page.status !== "scheduled") {
      return res.status(400).json({ error: "Use the /schedule endpoint to schedule a page" });
    }
    if (data.slug) {
      data.slug = normalizeSlug(data.slug);
      const existing = await storage.cmsPages.getPageBySlug(data.slug);
      if (existing && existing.id !== page.id) {
        return res.status(409).json({ error: "A page with this slug already exists" });
      }
    }

    const adminId = req.user!.id;

    await storage.cmsPageRevisions.createRevision({
      pageId: page.id,
      title: page.title,
      content: page.content as Record<string, unknown>,
      status: page.status,
      changedBy: adminId,
      changeNote: "Updated",
    });

    const updated = await storage.cmsPages.updatePage(page.id, { ...data, updatedBy: adminId });
    if (updated) {
      await syncCmsPageRelationships(page, updated);
    }
    res.json(updated);
  } catch (error) {
    logger.cms.error("Failed to update page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to update CMS page" });
  }
});

router.delete("/pages/:id", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await resolvePage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const force = req.query.force === "true";
    const menuReferences = await getCmsPageMenuReferences(page);
    if (menuReferences.length > 0 && !force) {
      return res.status(409).json({
        error:
          "This page is still used in navigation menus. Review linked references before deleting it.",
        code: "CMS_PAGE_HAS_MENU_REFERENCES",
        menuReferences,
      });
    }

    if (page.status === "published" && !force) {
      return res
        .status(400)
        .json({ error: "Cannot delete a published page. Unpublish it first or use ?force=true" });
    }

    await storage.cmsPages.deletePage(page.id);
    res.json({ success: true });
  } catch (error) {
    logger.cms.error("Failed to delete page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to delete CMS page" });
  }
});

router.post("/pages/:id/publish", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const adminId = req.user!.id;
    const existingPage = await resolvePage(id);
    if (!existingPage) return res.status(404).json({ error: "Page not found" });
    const page = await storage.cmsPages.publishPage(existingPage.id, adminId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    logger.cms.error("Failed to publish page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to publish CMS page" });
  }
});

router.post("/pages/:id/schedule", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const adminId = req.user!.id;
    const { scheduledAt } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ error: "scheduledAt is required" });
    }
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime()) || date <= new Date()) {
      return res.status(400).json({ error: "scheduledAt must be a valid future date" });
    }
    const existingPage = await resolvePage(id);
    if (!existingPage) return res.status(404).json({ error: "Page not found" });
    const page = await storage.cmsPages.schedulePage(existingPage.id, date, adminId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    logger.cms.error("Failed to schedule page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to schedule CMS page" });
  }
});

router.post("/pages/:id/unpublish", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const adminId = req.user!.id;
    const existingPage = await resolvePage(id);
    if (!existingPage) return res.status(404).json({ error: "Page not found" });
    const force = req.query.force === "true";
    const menuReferences = await getCmsPageMenuReferences(existingPage);
    if (menuReferences.length > 0 && !force) {
      return res.status(409).json({
        error:
          "This page is still used in navigation menus. Review linked references before moving it to draft.",
        code: "CMS_PAGE_HAS_MENU_REFERENCES",
        menuReferences,
      });
    }

    const page = await storage.cmsPages.unpublishPage(existingPage.id, adminId);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    logger.cms.error("Failed to unpublish page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to unpublish CMS page" });
  }
});

router.get("/pages/:id/revisions", p1Authorize("content"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await resolvePage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });
    const revisions = await storage.cmsPageRevisions.getRevisions(page.id);
    res.json(revisions);
  } catch (error) {
    logger.cms.error("Failed to fetch revisions", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch revisions" });
  }
});

router.post("/pages/:pageId/revisions/:revisionId/restore", p1Authorize("content"), async (req, res) => {
  try {
    const pageId = paramString(req.params.pageId);
    const revisionId = paramString(req.params.revisionId);
    const adminId = req.user?.id;

    const page = await resolvePage(pageId);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const revision = await storage.cmsPageRevisions.getRevision(revisionId);
    if (!revision || revision.pageId !== page.id) {
      return res.status(404).json({ error: "Revision not found" });
    }

    await storage.cmsPageRevisions.createRevision({
      pageId: page.id,
      title: page.title,
      content: page.content as Record<string, unknown>,
      status: page.status,
      changedBy: adminId,
      changeNote: "Before restore",
    });

    const restored = await storage.cmsPages.updatePage(page.id, {
      title: revision.title,
      content: revision.content as Record<string, unknown>,
      updatedBy: adminId,
    });

    await storage.cmsPageRevisions.createRevision({
      pageId: page.id,
      title: revision.title,
      content: revision.content as Record<string, unknown>,
      status: page.status,
      changedBy: adminId,
      changeNote: "Restored from revision",
    });

    res.json(restored);
  } catch (error) {
    logger.cms.error("Failed to restore revision", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to restore revision" });
  }
});

export default router;
