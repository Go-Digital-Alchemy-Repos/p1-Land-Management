import { Router } from "express";
import { z } from "zod";
import {
  WEBSITE_SCRIPT_CATEGORY,
  websiteScriptKeys,
  websiteScriptKeyRules,
  websiteScriptWrite,
} from "@shared/website-script-management";
import { storage } from "../storage";
import { requireWebsiteOwner } from "../middleware/website-owner";
import { asyncHandler } from "../middleware/error-handler";
import { websiteScriptManagement } from "../services/website-script-management.service";
const router = Router();
router.use(requireWebsiteOwner);
router.get(
  "/",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    res.json(await websiteScriptManagement.ownerConfiguration());
  }),
);
router.put(
  "/",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const body = websiteScriptWrite.parse(req.body);
    await storage.settings.upsertSettings(
      Object.entries(websiteScriptKeys).map(([field, key]) => ({
        key,
        category: WEBSITE_SCRIPT_CATEGORY,
        isSecret: false,
        value: body.googleAnalytics[field as keyof typeof websiteScriptKeys],
      })),
      {
        category: WEBSITE_SCRIPT_CATEGORY,
        version: body.expectedVersion,
        keyRules: websiteScriptKeyRules,
      },
      {
        userId: req.user!.id,
        action: "website_script_management_updated",
        details: JSON.stringify({
          keys: Object.values(websiteScriptKeys),
          source: body.googleAnalytics.source,
        }),
      },
    );
    res.json({ saved: true });
  }),
);
export default router;
