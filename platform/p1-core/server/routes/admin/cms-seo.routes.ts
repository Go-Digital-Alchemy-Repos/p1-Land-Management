import { requireAdminPermission as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/error-handler";
import { insertSeoSettingsSchema } from "@shared/schema";
import { buildRobotsTxtPayload } from "../../services/robots-txt.service";

const router = Router();

const updateSeoSettingsSchema = insertSeoSettingsSchema.partial();

router.get(
  "/seo", p1Authorize("content"),
  asyncHandler(async (_req, res) => {
    const settings = await storage.seoSettings.get();
    res.json(settings ?? {});
  }),
);

router.put(
  "/seo", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const parsed = updateSeoSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }
    const settings = await storage.seoSettings.upsert(parsed.data);
    res.json(settings);
  }),
);

router.get(
  "/seo/robots-txt", p1Authorize("content"),
  asyncHandler(async (_req, res) => {
    const settings = await storage.seoSettings.get();
    res.json(buildRobotsTxtPayload(settings));
  }),
);

router.put(
  "/seo/robots-txt", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        customContent: z.string().nullable().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || "Validation failed" });
    }

    const normalized =
      typeof parsed.data.customContent === "string" && parsed.data.customContent.trim().length > 0
        ? `${parsed.data.customContent.replace(/\s+$/, "")}\n`
        : null;

    const settings = await storage.seoSettings.upsert({ customRobotsTxt: normalized });
    res.json(buildRobotsTxtPayload(settings));
  }),
);

export default router;
