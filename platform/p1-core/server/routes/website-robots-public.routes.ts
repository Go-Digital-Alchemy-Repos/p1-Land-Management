import { Router } from "express";
import { storage } from "../storage";
import { projectWebsiteRobots } from "../services/public-website-robots.service";
const router = Router();
router.get("/website-robots", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (Object.keys(req.query).length) return res.status(400).json({ error: "Unsupported query" });
  try { return res.json(projectWebsiteRobots(await storage.seoSettings.get())); }
  catch { return res.status(503).json({ error: "Website robots unavailable" }); }
});
export default router;
