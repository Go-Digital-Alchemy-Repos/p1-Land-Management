import { pageLease } from "../../services/cms-page-leases.service";
import { CmsMutationError } from "../../services/cms-concurrency";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/error-handler";
import { editorLockRequestSchema, editorLockResourceTypeSchema } from "@shared/schema";
import { requireEditorLockAccess } from "../../middleware/editor-lock-access";
import {
  acquireEditorLock,
  getEditorLock,
  heartbeatEditorLock,
  listActiveEditorLocks,
  releaseEditorLock,
} from "../../services/editor-locks.service";

const router = Router();
router.use((_req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  next();
});

const lockParamsSchema = z.object({
  resourceType: editorLockResourceTypeSchema,
  resourceId: z.string().min(1),
});

router.get(
  "/resource/:resourceType",
  asyncHandler(async (req, res) => {
    const resourceType = editorLockResourceTypeSchema.parse(req.params.resourceType);
    requireEditorLockAccess(req, resourceType);
    res.json(await listActiveEditorLocks(resourceType, req.user));
  }),
);

router.get(
  "/:resourceType/:resourceId",
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = lockParamsSchema.parse(req.params);
    requireEditorLockAccess(req, resourceType);
    res.json(
      resourceType === "cms_page"
        ? await pageLease("status", resourceId, req.user)
        : await getEditorLock(resourceType, resourceId, req.user),
    );
  }),
);

router.post(
  "/acquire",
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = editorLockRequestSchema.parse(req.body);
    requireEditorLockAccess(req, resourceType);
    res.json(
      resourceType === "cms_page"
        ? await pageLease("acquire", resourceId, req.user, req.body)
        : await acquireEditorLock(resourceType, resourceId, req.user),
    );
  }),
);

router.post(
  "/heartbeat",
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = editorLockRequestSchema.parse(req.body);
    requireEditorLockAccess(req, resourceType);
    res.json(
      resourceType === "cms_page"
        ? await pageLease("heartbeat", resourceId, req.user, req.body)
        : await heartbeatEditorLock(resourceType, resourceId, req.user),
    );
  }),
);

router.post(
  "/release",
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = editorLockRequestSchema.parse(req.body);
    requireEditorLockAccess(req, resourceType);
    res.json(
      resourceType === "cms_page"
        ? await pageLease("release", resourceId, req.user, req.body)
        : await releaseEditorLock(resourceType, resourceId, req.user),
    );
  }),
);

// Path-scoped operations let the dashboard allowlist bind a grant to one resource type.
for (const [action, operation] of Object.entries({
  acquire: acquireEditorLock,
  heartbeat: heartbeatEditorLock,
  release: releaseEditorLock,
})) {
  router.post(
    `/:resourceType/:resourceId/${action}`,
    asyncHandler(async (req, res) => {
      const { resourceType, resourceId } = lockParamsSchema.parse(req.params);
      requireEditorLockAccess(req, resourceType);
      res.json(
        resourceType === "cms_page"
          ? await pageLease(
              action as "acquire" | "heartbeat" | "release",
              resourceId,
              req.user,
              req.body,
            )
          : await operation(resourceType, resourceId, req.user),
      );
    }),
  );
}

router.use(
  (
    error: unknown,
    _req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    if (error instanceof CmsMutationError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code, ...error.details });
    next(error);
  },
);
export default router;
