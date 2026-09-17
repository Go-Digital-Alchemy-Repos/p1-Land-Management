import { Router } from "express";
import { getSocialMediaLinks, normalizeSocialIconStyle } from "@shared/social-media";
import { storage } from "../storage";
const router = Router();
router.get("/website-social", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (Object.keys(req.query).length) return res.status(400).json({ error: "Unsupported query" });
  try {
    const { values } = await storage.settings.getCategorySnapshot("branding", true);
    const links = getSocialMediaLinks(values).map(({ platform, url }) => ({
      platform,
      url: new URL(url).href,
    }));
    res.json({
      schemaVersion: 1,
      stackId: "p1-land-management",
      iconStyle: normalizeSocialIconStyle(values.social_icon_style),
      links,
    });
  } catch {
    res.status(503).json({ error: "Website social links unavailable" });
  }
});
export default router;
