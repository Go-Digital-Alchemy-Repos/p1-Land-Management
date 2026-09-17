import { Router } from "express";
import { z } from "zod";
import { SOCIAL_SETTING_KEYS, SOCIAL_ICON_STYLES, isSafeSocialUrl } from "@shared/social-media";
import { requireBusinessCapability } from "../middleware/auth";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
const router = Router();
const link = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === "" || isSafeSocialUrl(value),
    "Use an HTTP or HTTPS URL without credentials",
  );
const style = z.enum(["", ...SOCIAL_ICON_STYLES]);
const input = z
  .object({
    expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
    settings: z
      .object(
        Object.fromEntries(
          SOCIAL_SETTING_KEYS.map((key) => [
            key,
            (key === "social_icon_style" ? style : link).optional(),
          ]),
        ),
      )
      .strict()
      .refine(
        (values) => Object.keys(values).length > 0,
        "Select at least one social setting to change",
      ),
  })
  .strict();
router.use(requireBusinessCapability("marketing.design.social-media"));
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
      settings: Object.fromEntries(
        SOCIAL_SETTING_KEYS.map((key) => [key, snapshot.values[key] ?? ""]),
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
    const entries = Object.entries(body.settings).map(([key, value]) => ({
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
        action: "website_social_updated",
        details: JSON.stringify(entries.map((entry) => entry.key).sort()),
      },
    );
    res.json({ saved: true });
  }),
);
export default router;
