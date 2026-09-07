import { Router } from "express";
import { asyncHandler } from "../middleware/error-handler";
import * as r2Service from "../services/r2.service";
import { isPublicR2Key } from "../utils/public-storage-policy";

const router = Router();
function getKeyParam(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join("/");
  }

  return typeof value === "string" ? value : "";
}

router.get(
  "/{*key}",
  asyncHandler(async (req, res) => {
    const key = getKeyParam(req.params.key);
    if (!isPublicR2Key(key)) {
      return res.status(404).send("Not found");
    }

    const downloaded = await r2Service.downloadFile(key);
    if (!downloaded) {
      return res.status(404).send("Not found");
    }

    // Documents (including legacy uploads with untrusted MIME) never execute inline.
    const inlineImage = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(downloaded.contentType || "");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!inlineImage) {
      res.setHeader("Content-Disposition", "attachment");
      res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
    }
    res.setHeader("Content-Type", downloaded.contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(downloaded.buffer);
  }),
);

export default router;
