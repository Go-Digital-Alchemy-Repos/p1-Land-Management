import { Router } from "express";
import { WEBSITE_COLOR_KEYS } from "@shared/website-colors";
import { storage } from "../storage";
const router = Router();
const mutedFallbacks = new Set([
  "text_heading_subtext_color",
  "text_supporting_copy_color",
  "text_helper_text_color",
]);
/** Public normalized palette only: no category metadata, private values, or executable CSS. */
router.get("/website-colors", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (Object.keys(req.query).length) return res.status(400).json({ error: "Unsupported query" });
  try {
    const { values } = await storage.settings.getCategorySnapshot("branding", true);
    const colors: Record<string, string> = {};
    for (const key of WEBSITE_COLOR_KEYS) {
      const raw = values[key] || (mutedFallbacks.has(key) ? values.text_muted_color : "");
      if (typeof raw !== "string") continue;
      const hex = raw.trim().replace(/^#/, "");
      if (/^[0-9a-fA-F]{6}$/.test(hex)) colors[key] = `#${hex.toUpperCase()}`;
    }
    res.json({ schemaVersion: 1, stackId: "p1-land-management", colors });
  } catch {
    res.status(503).json({ error: "Website colors unavailable" });
  }
});
export default router;
