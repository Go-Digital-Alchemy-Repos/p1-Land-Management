import { db } from "../db";
import { resolvePublicBlogMedia } from "../services/public-blog-media.service";
import { Router } from "express";
import { getSiteFeatures } from "../services/site-features.service";
import { listPublishedBlogSnapshots } from "../services/blog-publication.service";
import { projectPublicBlog } from "../services/public-blog-projection.service";
const router = Router();
router.get("/website/blog-publication", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (Object.keys(req.query).length) return res.status(400).json({ error: "Unsupported query" });
  try {
    const features = await getSiteFeatures();
    return res.json(
      projectPublicBlog(
        features.cmsEnabled && features.blogEnabled
          ? await db.transaction(
              async (tx) => resolvePublicBlogMedia(await listPublishedBlogSnapshots(tx), tx),
              { isolationLevel: "repeatable read", accessMode: "read only" },
            )
          : [],
      ),
    );
  } catch {
    return res.status(503).json({ error: "Blog publications unavailable" });
  }
});
export default router;
