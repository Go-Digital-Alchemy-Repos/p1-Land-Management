import { Router } from "express";
import { z } from "zod";
import { WEBSITE_FONT_KEYS, BRANDING_FONT_OPTIONS } from "@shared/website-fonts";
import { requireBusinessCapability } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
const router = Router();
const font = z
  .string()
  .refine(
    (value) => value === "" || BRANDING_FONT_OPTIONS.some((option) => option.value === value),
    "Unknown font",
  );
const input = z
  .object({
    expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
    fonts: z
      .object(Object.fromEntries(WEBSITE_FONT_KEYS.map((key) => [key, font.optional()])))
      .strict()
      .refine((values) => Object.keys(values).length > 0, "Select at least one font to change"),
  })
  .strict();
router.use(requireBusinessCapability("marketing.design.typography"));
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});
router.get(
  "/",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const snapshot = await storage.settings.getCategorySnapshot("branding", true);
    // Preserve raw stored values, even values outside the current write contract.
    res.json({
      fonts: Object.fromEntries(WEBSITE_FONT_KEYS.map((key) => [key, snapshot.values[key] ?? ""])),
      options: BRANDING_FONT_OPTIONS.map(({ value, label, category }) => ({
        value,
        label,
        category,
      })),
      version: snapshot.version,
    });
  }),
);
router.put(
  "/",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const body = input.parse(req.body);
    const entries = Object.entries(body.fonts).map(([key, value]) => ({
      key,
      value: value!,
      category: "branding",
      isSecret: false,
    }));
    await storage.settings.upsertSettings(
      entries,
      { category: "branding", version: body.expectedVersion, publicOnly: true },
      {
        userId: req.user!.id,
        action: "website_typography_updated",
        details: JSON.stringify(entries.map((entry) => entry.key).sort()),
      },
    );
    res.json({ saved: true });
  }),
);
export default router;
