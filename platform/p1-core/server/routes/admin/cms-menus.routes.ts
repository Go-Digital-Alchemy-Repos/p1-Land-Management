import { requireAdminPermission as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { paramString } from "../../utils/params";
import { MENU_LOCATIONS, menuItemSchema } from "@shared/schema";
import { logger } from "../../utils/logger";

const router = Router();

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

router.get("/menus", p1Authorize("design"), async (req, res) => {
  try {
    const menus = await storage.cmsMenus.getAll();
    res.json(menus);
  } catch (error) {
    logger.cms.error("Failed to fetch menus", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch menus" });
  }
});

router.get("/menus/:id", p1Authorize("design"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const menu = await storage.cmsMenus.getById(id);
    if (!menu) return res.status(404).json({ error: "Menu not found" });
    res.json(menu);
  } catch (error) {
    logger.cms.error("Failed to fetch menu", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

router.post("/menus", p1Authorize("design"), async (req, res) => {
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

    if (data.location !== "unassigned") {
      await storage.cmsMenus.clearLocation(data.location);
    }

    const menu = await storage.cmsMenus.create(data);
    res.status(201).json(menu);
  } catch (error) {
    logger.cms.error("Failed to create menu", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to create menu" });
  }
});

router.put("/menus/:id", p1Authorize("design"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const existing = await storage.cmsMenus.getById(id);
    if (!existing) return res.status(404).json({ error: "Menu not found" });

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

    if (data.location && data.location !== "unassigned" && data.location !== existing.location) {
      await storage.cmsMenus.clearLocation(data.location);
    }

    const updated = await storage.cmsMenus.update(id, data);
    res.json(updated);
  } catch (error) {
    logger.cms.error("Failed to update menu", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to update menu" });
  }
});

router.delete("/menus/:id", p1Authorize("design"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const menu = await storage.cmsMenus.getById(id);
    if (!menu) return res.status(404).json({ error: "Menu not found" });
    await storage.cmsMenus.delete(id);
    res.json({ success: true });
  } catch (error) {
    logger.cms.error("Failed to delete menu", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to delete menu" });
  }
});

export default router;
