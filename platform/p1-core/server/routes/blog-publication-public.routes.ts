import { listStaticBlogRoutes } from "../services/blog-static-import-receipts.service";
import { db } from "../db";
import { resolvePublicBlogMedia } from "../services/public-blog-media.service";
import { Router } from "express";
import { storage } from "../storage";
import { parseSiteFeatures } from "@shared/site-features";
import { listPublishedBlogSnapshots } from "../services/blog-publication.service";
import { projectPublicBlog } from "../services/public-blog-projection.service";
const router = Router();
router.get("/website/blog-publication", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (Object.keys(req.query).length) return res.status(400).json({ error: "Unsupported query" });
  try {
    // A failed settings read must not re-enable a deliberately disabled Blog.
    const features = parseSiteFeatures(
      await storage.settings.getDecryptedCategory("system_configuration"),
    );
    const projection = await db.transaction(
      async (tx) => {
        // Ownership is permanent even when Blog/CMS is disabled or every post is
        // withdrawn. Omitting it would resurrect website-owned static fallbacks.
        const staticRoutes = await listStaticBlogRoutes(tx);
        const rows =
          features.cmsEnabled && features.blogEnabled
            ? await resolvePublicBlogMedia(await listPublishedBlogSnapshots(tx), tx)
            : [];
        return projectPublicBlog(rows, staticRoutes);
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );
    return res.json(projection);
  } catch {
    return res.status(503).json({ error: "Blog publications unavailable" });
  }
});
export default router;
