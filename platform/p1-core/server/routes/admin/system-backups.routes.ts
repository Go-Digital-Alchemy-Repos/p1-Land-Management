import { requireRole as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { asyncHandler } from "../../middleware/error-handler";
import {
  getBackupStatus,
  restoreSystemBackupFromKey,
  runSystemBackup,
} from "../../services/system-backup.service";

const router = Router();

router.get(
  "/system/backups/status", p1Authorize("admin"),
  asyncHandler(async (_req, res) => {
    res.json(await getBackupStatus());
  }),
);

router.post(
  "/system/backups/run", p1Authorize("admin"),
  asyncHandler(async (req, res) => {
    const requestedReason = req.body?.reason === "manual" ? "manual" : "manual";
    const manifest = await runSystemBackup(requestedReason);
    res.status(201).json(manifest);
  }),
);

router.post(
  "/system/backups/restore", p1Authorize("admin"),
  asyncHandler(async (req, res) => {
    const key = typeof req.body?.key === "string" ? req.body.key.trim() : "";

    if (!key) {
      res.status(400).json({ message: "A backup key is required to run a restore." });
      return;
    }

    const manifest = await restoreSystemBackupFromKey(key);
    res.status(200).json({
      restored: true,
      manifest,
      message: `Restore completed from backup created ${manifest.createdAt}.`,
    });
  }),
);

export default router;
