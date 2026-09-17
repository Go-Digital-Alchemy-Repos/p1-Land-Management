import { Router } from "express";
import { BRANDING_FONT_OPTIONS } from "@shared/website-fonts";
import { storage } from "../storage";
const router = Router();
router.get("/website-fonts", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (Object.keys(req.query).length) return res.status(400).json({ error: "Unsupported query" });
  try {
    const { values } = await storage.settings.getCategorySnapshot("branding", true);
    const project = (key: string) => {
      const option = BRANDING_FONT_OPTIONS.find((option) => option.value === values[key]);
      return option
        ? { name: option.label, fallback: option.category === "sans" ? "sans-serif" : "serif" }
        : null;
    };
    res.json({
      schemaVersion: 1,
      stackId: "p1-land-management",
      body: project("frontend_body_font"),
      heading: project("frontend_heading_font"),
    });
  } catch {
    res.status(503).json({ error: "Website fonts unavailable" });
  }
});
export default router;
