import { requireAdminPermission as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { paramString } from "../../utils/params";
import { logger } from "../../utils/logger";
import { sidebarWidgetSchema } from "@shared/schema";

const router = Router();

const sidebarBodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
  widgets: z.array(sidebarWidgetSchema).default([]),
});

router.get("/sidebars", p1Authorize("design"), async (req, res) => {
  try {
    const sidebars = await storage.cmsSidebars.getAll();
    res.json(sidebars);
  } catch (error) {
    logger.cms.error("Failed to fetch sidebars", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch sidebars" });
  }
});

router.get("/sidebars/:id", p1Authorize("design"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const sidebar = await storage.cmsSidebars.getById(id);
    if (!sidebar) return res.status(404).json({ error: "Sidebar not found" });
    res.json(sidebar);
  } catch (error) {
    logger.cms.error("Failed to fetch sidebar", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to fetch sidebar" });
  }
});

router.post("/sidebars", p1Authorize("design"), async (req, res) => {
  try {
    const parsed = sidebarBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }
    const sidebar = await storage.cmsSidebars.create(parsed.data);
    res.status(201).json(sidebar);
  } catch (error) {
    logger.cms.error("Failed to create sidebar", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to create sidebar" });
  }
});

router.put("/sidebars/:id", p1Authorize("design"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const existing = await storage.cmsSidebars.getById(id);
    if (!existing) return res.status(404).json({ error: "Sidebar not found" });

    const parsed = sidebarBodySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }

    const updated = await storage.cmsSidebars.update(id, parsed.data);
    res.json(updated);
  } catch (error) {
    logger.cms.error("Failed to update sidebar", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to update sidebar" });
  }
});

router.delete("/sidebars/:id", p1Authorize("design"), async (req, res) => {
  try {
    const id = paramString(req.params.id);
    const sidebar = await storage.cmsSidebars.getById(id);
    if (!sidebar) return res.status(404).json({ error: "Sidebar not found" });
    await storage.cmsSidebars.delete(id);
    res.json({ success: true });
  } catch (error) {
    logger.cms.error("Failed to delete sidebar", error, { requestId: req.requestId });
    res.status(500).json({ error: "Failed to delete sidebar" });
  }
});

export default router;
