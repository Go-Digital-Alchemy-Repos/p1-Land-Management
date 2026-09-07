import { Router } from "express";
import { storage } from "../storage";
import { logger } from "../utils/logger";
import {
  contentIdentity,
  loadConfiguredClientSiteManifest,
  parseComponentContent,
  publishedContentEtag,
} from "../services/client-site-content.service";

const router = Router();

router.get("/:routeId/:componentKey", async (req, res) => {
  try {
    const routeId = String(req.params.routeId);
    const componentKey = String(req.params.componentKey);
    const manifest = await loadConfiguredClientSiteManifest();
    const record = await storage.clientSiteContent.get(
      contentIdentity(manifest, routeId, componentKey),
    );
    if (!record?.publishedContent || record.publishedRevision === null) {
      return res.status(404).json({ error: "Published content not found" });
    }
    const content = parseComponentContent(manifest, routeId, componentKey, record.publishedContent);
    const etag = publishedContentEtag(record);
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    if (req.get("if-none-match") === etag) return res.status(304).end();
    return res.json({
      stackId: record.stackId,
      routeId,
      componentKey,
      revision: record.publishedRevision,
      publishedAt: record.publishedAt,
      content,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Client site")) {
      return res.status(404).json({ error: error.message });
    }
    logger.cms.error("Failed to serve published client site content", error);
    return res.status(503).json({ error: "Published content is temporarily unavailable" });
  }
});

export default router;
