import { Router } from "express";
import { getSiteFeatures } from "../services/site-features.service";
import {
  projectPublicWebsiteMenus,
  getPublicWebsiteMenus,
} from "../services/public-website-menus.service";
const router = Router();
router.get("/website-menus", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (Object.keys(req.query).length) return res.status(400).json({ error: "Unsupported query" });
  try {
    const features = await getSiteFeatures();
    return res.json(
      features.cmsEnabled
        ? await getPublicWebsiteMenus()
        : projectPublicWebsiteMenus([], [], [], []),
    );
  } catch {
    return res.status(503).json({ error: "Website menus unavailable" });
  }
});
export default router;
