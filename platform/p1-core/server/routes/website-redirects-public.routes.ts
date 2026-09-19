import { Router } from "express";
import { createHash } from "node:crypto";
import { storage } from "../storage";
import { validateRedirectCollection } from "../../shared/public-redirects";
const router = Router();
router.get("/website-redirects", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (Object.keys(req.query).length) return res.status(400).json({ error: "Unsupported query" });
  try {
    const redirects = validateRedirectCollection(await storage.redirects.getAll());
    return res.json({
      schemaVersion: 1,
      stackId: "p1-land-management",
      version: createHash("sha256").update(JSON.stringify(redirects)).digest("hex"),
      redirects,
    });
  } catch {
    return res.status(503).json({ error: "Website redirects unavailable" });
  }
});
export default router;
