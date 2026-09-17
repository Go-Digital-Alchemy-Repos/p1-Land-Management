import { Router } from "express";
import { z } from "zod";
import { WEBSITE_COLOR_KEYS } from "@shared/website-colors";
import { requireBusinessCapability } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
const router = Router();
const color = z.string().regex(/^(?:#[0-9a-fA-F]{6})?$/);
const input = z
  .object({
    expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
    colors: z
      .object(Object.fromEntries(WEBSITE_COLOR_KEYS.map((key) => [key, color.optional()])))
      .strict()
      .refine((values) => Object.keys(values).length > 0, "Select at least one color to change"),
  })
  .strict();
router.use(requireBusinessCapability("marketing.design.colors"));
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
      colors: Object.fromEntries(
        WEBSITE_COLOR_KEYS.map((key) => [key, snapshot.values[key] ?? ""]),
      ),
      version: snapshot.version,
    });
  }),
);
router.put(
  "/",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const body = input.parse(req.body);
    const entries = Object.entries(body.colors).map(([key, value]) => ({
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
        action: "website_colors_updated",
        details: JSON.stringify(entries.map((entry) => entry.key).sort()),
      },
    );
    res.json({ saved: true });
  }),
);
export default router;
