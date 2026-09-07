import { requireAdminPermission as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/error-handler";
import { storage } from "../../storage";
import { ensureSystemCmsSections } from "../../services/system-cms-sections.service";
import { paramString } from "../../utils/params";

const router = Router();

const createSectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().optional().default("general"),
  blocks: z.array(z.record(z.unknown())).default([]),
  thumbnailUrl: z.string().optional(),
});

const updateSectionSchema = createSectionSchema.partial();

router.get(
  "/sections", p1Authorize("content", "design"),
  asyncHandler(async (_req, res) => {
    const sections = await storage.cmsSections.getAllSections();
    res.json(sections);
  }),
);

router.post(
  "/sections/system/starter-library", p1Authorize("content", "design"),
  asyncHandler(async (_req, res) => {
    const result = await ensureSystemCmsSections({ refreshExisting: true });
    res.json({ success: true, ...result });
  }),
);

router.get(
  "/sections/:id", p1Authorize("content", "design"),
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const section = await storage.cmsSections.getSection(id);
    if (!section) return res.status(404).json({ error: "Section not found" });
    res.json(section);
  }),
);

router.post(
  "/sections", p1Authorize("content", "design"),
  asyncHandler(async (req, res) => {
    const parsed = createSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const adminId = req.user?.id;
    const section = await storage.cmsSections.createSection({
      ...parsed.data,
      createdBy: adminId,
    });
    res.status(201).json(section);
  }),
);

router.put(
  "/sections/:id", p1Authorize("content", "design"),
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const existing = await storage.cmsSections.getSection(id);
    if (!existing) return res.status(404).json({ error: "Section not found" });

    const parsed = updateSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
    }
    const updated = await storage.cmsSections.updateSection(id, {
      ...parsed.data,
    });
    res.json(updated);
  }),
);

router.delete(
  "/sections/:id", p1Authorize("content", "design"),
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const ok = await storage.cmsSections.deleteSection(id);
    if (!ok) return res.status(404).json({ error: "Section not found" });
    res.json({ success: true });
  }),
);

export default router;
