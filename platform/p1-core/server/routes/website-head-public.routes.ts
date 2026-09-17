import { Router } from "express";
import { storage } from "../storage";
const router = Router();
/** Public projection of the Owner-authored markup only. Never expose the settings category. */
router.get("/website-head-tags", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (Object.keys(req.query).length) return res.status(400).json({ error: "Unsupported query" });
  try {
    const snapshot = await storage.settings.getCategorySnapshot("head_tag_additions", true);
    const html = snapshot.values.public_head_html ?? "";
    if (typeof html !== "string" || html.length > 100000)
      return res.status(503).json({ error: "Website head markup unavailable" });
    return res.json({ schemaVersion: 1, stackId: "p1-land-management", html });
  } catch {
    return res.status(503).json({ error: "Website head markup unavailable" });
  }
});
export default router;
