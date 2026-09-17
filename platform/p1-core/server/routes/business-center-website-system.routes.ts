import { requireWebsiteOwner } from "../middleware/website-owner";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { asyncHandler } from "../middleware/error-handler";
const router = Router();
const category = "head_tag_additions",
  key = "public_head_html";
const input = z
  .object({ expectedVersion: z.string().regex(/^[a-f0-9]{64}$/), html: z.string().max(100000) })
  .strict();
router.use(requireWebsiteOwner);
router.get(
  "/head-tags",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const snapshot = await storage.settings.getCategorySnapshot(category, true);
    res.json({ html: snapshot.values[key] || "", version: snapshot.version });
  }),
);
router.put(
  "/head-tags",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const body = input.parse(req.body);
    await storage.settings.upsertSettings(
      [{ key, category, value: body.html, isSecret: false }],
      { category, version: body.expectedVersion, publicOnly: true },
      { userId: req.user!.id, action: "website_head_tags_updated", details: "public_head_html" },
    );
    res.json({ saved: true });
  }),
);
export default router;
