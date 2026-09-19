import { createPageWithRevision, mutateCmsPage } from "../../services/cms-page-mutations.service";
import { pagePreconditions, CmsMutationError } from "../../services/cms-concurrency";
import { loadCmsBuilderReferences } from "../../services/cms-builder-references";
import { asyncHandler } from "../../middleware/error-handler";
import { getBaseUrl } from "../../utils/route-helpers";
import { requireBusinessCapability as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { paramString } from "../../utils/params";
import { insertCmsPageSchema } from "@shared/schema";
import { logger } from "../../utils/logger";
import { createCmsPreviewToken } from "../../utils/cms-preview-token";
import { getCmsPageMenuReferences } from "../../services/cms-relationships.service";

const router = Router();
router.get(
  "/page-builder",
  p1Authorize("marketing.content.pages"),
  asyncHandler(async (_req, res) => {
    res.json(await loadCmsBuilderReferences(true));
  }),
);

const PAGE_TYPES = ["home", "about", "contact", "landing", "custom"] as const;
const STATUSES = ["draft", "published", "scheduled", "archived"] as const;

const createPageSchema = insertCmsPageSchema.extend({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-/]+$/, "Slug must be lowercase with hyphens only")
    .refine(
      (value) =>
        !/^(admin|api|assets|uploads|r2|health|cms-preview)(?:\/|$)/.test(
          value.replace(/^\/+/, ""),
        ),
      "This route is reserved",
    ),
  pageType: z.enum(PAGE_TYPES).default("custom"),
  status: z.enum(STATUSES).default("draft"),
});

const updatePageSchema = createPageSchema.partial().extend({
  title: z.string().min(1).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-/]+$/)
    .refine(
      (value) =>
        !/^(admin|api|assets|uploads|r2|health|cms-preview)(?:\/|$)/.test(
          value.replace(/^\/+/, ""),
        ),
      "This route is reserved",
    )
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

router.get("/pages", p1Authorize("marketing.content.pages"), async (req, res) => {
  try {
    const pages = await storage.cmsPages.getAllPages();
    res.json(pages);
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("Failed to fetch pages", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch CMS pages" });
  }
});

router.post("/pages", p1Authorize("marketing.content.pages"), async (req, res) => {
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
    const page = await createPageWithRevision({
      ...data,
      slug,
      createdBy: adminId,
      updatedBy: adminId,
    });

    res.status(201).json(page);
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("Failed to create page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to create CMS page" });
  }
});

router.get("/pages/:id", p1Authorize("marketing.content.pages"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await resolvePage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("Failed to fetch page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch CMS page" });
  }
});

router.get("/pages/:id/relationships", p1Authorize("marketing.content.pages"), async (req, res) => {
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
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("Failed to fetch page relationships", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch CMS page relationships" });
  }
});

router.post(
  "/pages/:id/relationships/remove-menu-items",
  p1Authorize("marketing.content.pages"),
  p1Authorize("marketing.content.menus"),
  async (req, res) => {
    try {
      const preconditions = pagePreconditions(req.body);
      res.json(
        await mutateCmsPage(
          paramString(req.params.id),
          req.user!.id,
          preconditions,
          "remove-menu-items",
        ),
      );
    } catch (error) {
      if (error instanceof CmsMutationError)
        return res
          .status(error.status)
          .json({ error: error.message, code: error.code, ...error.details });
      if (
        ((error as { code?: string })?.code ??
          (error as { cause?: { code?: string } })?.cause?.code) === "23505"
      )
        return res.status(409).json({ error: "A page with this slug already exists" });
      logger.cms.error("CMS page mutation failed", error, { requestId: req.requestId });
      res.status(500).json({ error: "Failed to change CMS page" });
    }
  },
);

router.get("/pages/:id/preview-link", p1Authorize("marketing.content.pages"), async (req, res) => {
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
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("Failed to generate preview link", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to generate preview link" });
  }
});

router.post("/pages/:id/duplicate", p1Authorize("marketing.content.pages"), async (req, res) => {
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

    const duplicate = await createPageWithRevision(
      {
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
      },
      `Duplicated from ${page.title}`,
    );

    res.status(201).json(duplicate);
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("Failed to duplicate page", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to duplicate CMS page" });
  }
});

router.put("/pages/:id", p1Authorize("marketing.content.pages"), async (req, res) => {
  try {
    const preconditions = pagePreconditions(req.body);
    const parsed = updatePageSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    if (parsed.data.slug) parsed.data.slug = normalizeSlug(parsed.data.slug);
    res.json(
      await mutateCmsPage(paramString(req.params.id), req.user!.id, preconditions, "save", {
        data: parsed.data,
      }),
    );
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("CMS page mutation failed", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to change CMS page" });
  }
});

router.delete("/pages/:id", p1Authorize("marketing.content.pages"), async (req, res) => {
  try {
    const preconditions = pagePreconditions(req.body);
    res.json(
      await mutateCmsPage(paramString(req.params.id), req.user!.id, preconditions, "delete", {
        force: req.query.force === "true",
      }),
    );
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("CMS page mutation failed", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to change CMS page" });
  }
});

router.post("/pages/:id/publish", p1Authorize("marketing.content.pages"), async (req, res) => {
  try {
    const preconditions = pagePreconditions(req.body);
    res.json(
      await mutateCmsPage(paramString(req.params.id), req.user!.id, preconditions, "publish"),
    );
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("CMS page mutation failed", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to change CMS page" });
  }
});

router.post("/pages/:id/schedule", p1Authorize("marketing.content.pages"), async (req, res) => {
  try {
    const preconditions = pagePreconditions(req.body);
    res.json(
      await mutateCmsPage(paramString(req.params.id), req.user!.id, preconditions, "schedule", {
        scheduledAt: new Date(req.body.scheduledAt),
      }),
    );
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("CMS page mutation failed", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to change CMS page" });
  }
});

router.post("/pages/:id/unpublish", p1Authorize("marketing.content.pages"), async (req, res) => {
  try {
    const preconditions = pagePreconditions(req.body);
    res.json(
      await mutateCmsPage(paramString(req.params.id), req.user!.id, preconditions, "unpublish", {
        force: req.query.force === "true",
      }),
    );
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("CMS page mutation failed", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to change CMS page" });
  }
});

router.get("/pages/:id/revisions", p1Authorize("marketing.content.pages"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const page = await resolvePage(id);
    if (!page) return res.status(404).json({ error: "Page not found" });
    const revisions = await storage.cmsPageRevisions.getRevisions(page.id);
    res.json(revisions);
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    if (
      ((error as { code?: string })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code) === "23505"
    )
      return res.status(409).json({ error: "A page with this slug already exists" });
    logger.cms.error("Failed to fetch revisions", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch revisions" });
  }
});

router.post(
  "/pages/:pageId/revisions/:revisionId/restore",
  p1Authorize("marketing.content.pages"),
  async (req, res) => {
    try {
      const preconditions = pagePreconditions(req.body);
      res.json(
        await mutateCmsPage(
          paramString(req.params.pageId),
          req.user!.id,
          preconditions,
          "restore",
          { revisionId: paramString(req.params.revisionId) },
        ),
      );
    } catch (error) {
      if (error instanceof CmsMutationError)
        return res
          .status(error.status)
          .json({ error: error.message, code: error.code, ...error.details });
      if (
        ((error as { code?: string })?.code ??
          (error as { cause?: { code?: string } })?.cause?.code) === "23505"
      )
        return res.status(409).json({ error: "A page with this slug already exists" });
      logger.cms.error("CMS page mutation failed", error, { requestId: req.requestId });
      res.status(500).json({ error: "Failed to change CMS page" });
    }
  },
);

export default router;
