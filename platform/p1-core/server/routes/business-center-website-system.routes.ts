import { hasReservedWebsiteScriptMarkers } from "../services/website-script-management.service";
import websiteScripts from "./website-scripts.routes";
import {
  DEFAULT_SITE_FEATURES,
  SITE_FEATURE_SETTING_KEYS,
  parseSiteFeatures,
  type SiteFeatures,
} from "@shared/site-features";
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
router.use("/scripts", websiteScripts);
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
    if (hasReservedWebsiteScriptMarkers(body.html)) {
      const current = await storage.settings.getCategorySnapshot(category, true);
      if (body.html !== (current.values[key] || "")) {
        return res.status(400).json({ message: "Manage Google Analytics and Turnstile through Head Tags > Managed scripts. Remove their script snippets from custom head markup." });
      }
    }
    await storage.settings.upsertSettings(
      [{ key, category, value: body.html, isSecret: false }],
      { category, version: body.expectedVersion, publicOnly: true },
      { userId: req.user!.id, action: "website_head_tags_updated", details: "public_head_html" },
    );
    res.json({ saved: true });
  }),
);
const featureCategory = "system_configuration";
const featuresSchema: z.ZodType<SiteFeatures> = z
  .object({
    cmsEnabled: z.boolean(),
    blogEnabled: z.boolean(),
    eventsEnabled: z.boolean(),
    crmEnabled: z.boolean(),
    careersEnabled: z.boolean(),
  })
  .strict();
const featureInput = z
  .object({ expectedVersion: z.string().regex(/^[a-f0-9]{64}$/), features: featuresSchema })
  .strict();
router.get(
  "/features",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const snapshot = await storage.settings.getCategorySnapshot(featureCategory, true);
    res.json({
      features: parseSiteFeatures(snapshot.values),
      defaults: DEFAULT_SITE_FEATURES,
      version: snapshot.version,
    });
  }),
);
router.put(
  "/features",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const body = featureInput.parse(req.body);
    await storage.settings.upsertSettings(
      Object.entries(SITE_FEATURE_SETTING_KEYS).map(([feature, key]) => ({
        key,
        category: featureCategory,
        value: body.features[feature as keyof typeof body.features] ? "true" : "false",
        isSecret: false,
      })),
      { category: featureCategory, version: body.expectedVersion, publicOnly: true },
      {
        userId: req.user!.id,
        action: "website_features_updated",
        details: JSON.stringify(body.features),
      },
    );
    res.json({ saved: true });
  }),
);
export default router;
