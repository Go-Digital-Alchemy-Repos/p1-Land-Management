import { mutateCmsMenu } from "../../services/cms-menu-mutations.service";
import { menuExpectedVersion, CmsMutationError } from "../../services/cms-concurrency";
import { requireBusinessCapability as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { paramString } from "../../utils/params";
import { MENU_LOCATIONS, menuItemSchema } from "@shared/schema";
import { logger } from "../../utils/logger";

const router = Router();

// Menu selectors need titles/paths, never draft bodies or form submissions/settings.
router.get("/menu-references", p1Authorize("marketing.content.menus"), async (_req, res, next) => {
  try {
    const [pages, forms] = await Promise.all([
      storage.cmsPages.getAllPages(),
      storage.forms.getAll(),
    ]);
    res.json({
      pages: pages.map(({ id, title, slug, status }) => ({ id, title, slug, status })),
      forms: forms.map(({ id, name, slug }) => ({ id, name, slug })),
    });
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    next(error);
  }
});

const menuBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.enum(MENU_LOCATIONS).default("unassigned"),
  items: z.array(menuItemSchema).default([]),
});

function validateDepth(items: z.infer<typeof menuItemSchema>[], depth = 1): boolean {
  if (depth > 3) return false;
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      if (!validateDepth(item.children, depth + 1)) return false;
    }
  }
  return true;
}

router.get("/menus", p1Authorize("marketing.content.menus"), async (req, res) => {
  try {
    const menus = await storage.cmsMenus.getAll();
    res.json(menus);
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    logger.cms.error("Failed to fetch menus", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch menus" });
  }
});

router.get("/menus/:id", p1Authorize("marketing.content.menus"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const menu = await storage.cmsMenus.getById(id);
    if (!menu) return res.status(404).json({ error: "Menu not found" });
    res.json(menu);
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    logger.cms.error("Failed to fetch menu", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

router.post("/menus", p1Authorize("marketing.content.menus"), async (req, res) => {
  try {
    const parsed = menuBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }
    const data = parsed.data;

    if (!validateDepth(data.items)) {
      return res.status(400).json({ error: "Menu items cannot be nested more than 3 levels deep" });
    }

    const menu = await mutateCmsMenu(null, data);
    res.status(201).json(menu);
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    logger.cms.error("Failed to create menu", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to create menu" });
  }
});

router.put("/menus/:id", p1Authorize("marketing.content.menus"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const expectedVersion = menuExpectedVersion(req.body);

    const parsed = menuBodySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }
    const data = parsed.data;

    if (data.items && !validateDepth(data.items)) {
      return res.status(400).json({ error: "Menu items cannot be nested more than 3 levels deep" });
    }

    const updated = await mutateCmsMenu(id, data, expectedVersion);
    res.json(updated);
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    logger.cms.error("Failed to update menu", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to update menu" });
  }
});

router.delete("/menus/:id", p1Authorize("marketing.content.menus"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const expectedVersion = menuExpectedVersion(req.body);
    await mutateCmsMenu(id, {}, expectedVersion, true);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    logger.cms.error("Failed to delete menu", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to delete menu" });
  }
});

export default router;
