import { Router } from "express";
import { storage } from "../storage";
import { projectPublicWebsiteIdentity } from "../services/public-website-identity.service";
const router = Router();
router.get("/website-identity", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (Object.keys(req.query).length) return res.status(400).json({ error: "Unsupported query" });
  try {
    res.json(
      await projectPublicWebsiteIdentity(
        await storage.settings.getCategorySnapshot("branding", true),
      ),
    );
  } catch {
    res.status(503).json({ error: "Website identity unavailable" });
  }
});
export default router;
