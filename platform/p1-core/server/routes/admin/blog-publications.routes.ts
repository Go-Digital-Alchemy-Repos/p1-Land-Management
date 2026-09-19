import { requireBusinessCapability } from "../../middleware/auth";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/error-handler";
import { blogEditorialSchema } from "@shared/schema/blog-publications";
import { pagePreconditionSchema, CmsMutationError } from "../../services/cms-concurrency";
import { mutateBlogPublication } from "../../services/blog-publication.service";
import {
  listBlogPublications,
  getBlogPublication,
  createBlogPublication,
  adoptBlogPublication,
  blogRevisionSummaries,
  previewBlogRevision,
} from "../../services/blog-publication-editor.service";
import { paramString } from "../../utils/params";
const router = Router();
router.use(requireBusinessCapability("marketing.content.blog"));
router.use((_req, res, next) => {
  res.set({ "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" });
  next();
});
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await listBlogPublications());
  }),
);
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = z
      .object({ data: blogEditorialSchema, editorInstanceId: z.string().uuid() })
      .strict()
      .parse(req.body);
    res
      .status(201)
      .json(await createBlogPublication(input.data, req.user!, input.editorInstanceId));
  }),
);
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getBlogPublication(paramString(req.params.id)));
  }),
);
router.post(
  "/:id/adopt",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        expectedLegacyFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
        editorInstanceId: z.string().uuid(),
        reason: z.string().trim().min(1).max(2000),
      })
      .strict()
      .parse(req.body);
    res.json(
      await adoptBlogPublication(
        paramString(req.params.id),
        req.user!,
        input.expectedLegacyFingerprint,
        input.editorInstanceId,
        input.reason,
      ),
    );
  }),
);
router.post(
  "/:id/actions",
  asyncHandler(async (req, res) => {
    const input = pagePreconditionSchema
      .extend({
        action: z.enum([
          "save",
          "publish",
          "unpublish",
          "restore",
          "delete",
          "schedule",
          "cancel_schedule",
        ]),
        data: blogEditorialSchema.optional(),
        revisionId: z
          .string()
          .regex(/^[A-Za-z0-9_-]{1,160}$/)
          .optional(),
        scheduledAt: z.string().datetime({ offset: true }).optional(),
      })
      .strict()
      .parse(req.body);
    const id = paramString(req.params.id);
    await mutateBlogPublication(id, req.user!.id, input, input.action, {
      data: input.data,
      revisionId: input.revisionId,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    });
    res.json(await getBlogPublication(id));
  }),
);
router.get(
  "/:id/revisions",
  asyncHandler(async (req, res) => {
    res.json(await blogRevisionSummaries(paramString(req.params.id)));
  }),
);
router.get(
  "/:id/preview",
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        revisionId: z
          .string()
          .regex(/^[A-Za-z0-9_-]{1,160}$/)
          .optional(),
      })
      .strict()
      .parse(req.query);
    res.json(await previewBlogRevision(paramString(req.params.id), query.revisionId));
  }),
);
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
