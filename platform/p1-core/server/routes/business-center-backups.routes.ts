import { Router } from "express";
import { z, ZodError } from "zod";
import { requireWebsiteOwner } from "../middleware/website-owner";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
import { getBackupStatus, restoreSystemBackupFromKey, runSystemBackup } from "../services/system-backup.service";
const router = Router();
const empty = z.object({}).strict();
const summarySchema = z.object({
  schemaVersion: z.literal(1),
  clientStackId: z.string().max(255).nullable(),
  key: z.string().min(1).max(2048),
  createdAt: z.string().datetime(),
  reason: z.enum(["manual", "scheduled", "startup"]),
  appVersion: z.string().max(255),
  gitCommitSha: z.string().max(64).nullable(),
  environment: z.string().max(255),
  storageSource: z.enum(["env", "settings"]),
  tableCount: z.number().int().nonnegative(),
  totalRowCount: z.number().int().nonnegative(),
  mediaAssetCount: z.number().int().nonnegative(),
});
const restoreRequest = z.object({
  key: z.string().min(1).max(2048),
  confirmation: z.string().min(1).max(2056),
}).strict();
function summary(manifest: Awaited<ReturnType<typeof runSystemBackup>>) {
  const {
    schemaVersion,
    clientStackId,
    key,
    createdAt,
    reason,
    appVersion,
    gitCommitSha,
    environment,
    storageSource,
    tableCount,
    totalRowCount,
    mediaAssetCount,
  } = manifest;
  const parsed = summarySchema.safeParse({
    schemaVersion,
    clientStackId: clientStackId ?? null,
    key,
    createdAt,
    reason,
    appVersion,
    gitCommitSha,
    environment,
    storageSource,
    tableCount,
    totalRowCount,
    mediaAssetCount,
  });
  if (!parsed.success) throw Error("Invalid backup summary");
  return parsed.data;
}
router.use(requireWebsiteOwner);
router.use((req, _res, next) => {
  try {
    empty.parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
});
router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    const status = await getBackupStatus();
    res.json({
      enabled: status.enabled,
      configured: status.configured,
      intervalHours: status.intervalHours,
      retentionDays: status.retentionDays,
      maxSnapshots: status.maxSnapshots,
      storage: status.storage
        ? {
            bucketName: status.storage.bucketName,
            prefix: status.storage.prefix,
            source: status.storage.source,
          }
        : null,
      latest: status.latest ? summary(status.latest) : null,
      recent: status.recent.map(summary),
    });
  }),
);
router.post(
  "/run",
  asyncHandler(async (req, res) => {
    empty.parse(req.body ?? {});
    await storage.activity.log(
      req.user!.id,
      "website_backup_requested",
      "Manual Core database snapshot; configured retention applies",
    );
    const manifest = await runSystemBackup("manual");
    await storage.activity.log(
      req.user!.id,
      "website_backup_completed",
      "Manual Core database snapshot completed",
    );
    res.status(201).json(summary(manifest));
  }),
);
router.post(
  "/restore",
  asyncHandler(async (req, res) => {
    const { key, confirmation } = restoreRequest.parse(req.body ?? {});
    if (confirmation !== `RESTORE ${key}`) {
      res.status(400).json({ message: "Type RESTORE followed by the exact archive key to confirm." });
      return;
    }
    await storage.activity.log(
      req.user!.id,
      "website_restore_requested",
      "Core database restore requested with explicit archive confirmation",
    );
    const manifest = await restoreSystemBackupFromKey(key);
    await storage.activity.log(
      req.user!.id,
      "website_restore_completed",
      "Core database restore completed; verify live content and restart other serving replicas",
    );
    res.json({ restored: true, manifest: summary({ ...manifest, key }) });
  }),
);
router.use(
  (
    error: unknown,
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    if (error instanceof ZodError) {
      next(error);
      return;
    }
    if (
      error instanceof Error &&
      error.message === "Another backup or restore is already running"
    ) {
      next(
        Object.assign(new Error("Another backup or restore is already running"), {
          statusCode: 409,
        }),
      );
      return;
    }
    next(
      Object.assign(
        new Error(
          "Backup or restore outcome could not be confirmed. Refresh status and verify the live system before starting another operation.",
        ),
        { statusCode: 503 },
      ),
    );
  },
);
export default router;
