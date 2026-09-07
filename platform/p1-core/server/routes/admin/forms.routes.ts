import { requireRole } from "../../middleware/auth";
import { backfillCommercialInquiries } from "../../services/commercial-backfill.service";
import { Router } from "express";
import { insertCmsFormSchema } from "@shared/schema";
import { asyncHandler } from "../../middleware/error-handler";
import { storage } from "../../storage";
import { paramString } from "../../utils/params";

const router = Router();

router.post(
  "/form-delivery-jobs/commercial-backfill",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    try {
      const result = await backfillCommercialInquiries(req.body, req.user!.id);
      res.status(result.outcome === "rejected" ? 409 : 200).json(result);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError")
        return res.status(400).json({ message: "Invalid commercial backfill request" });
      throw error;
    }
  }),
);

router.get(
  "/form-delivery-jobs",
  asyncHandler(async (req, res) => {
    try {
      res.json(await storage.forms.listDeliveryJobs(req.query));
    } catch (error) {
      if (error instanceof SyntaxError || (error instanceof Error && error.name === "ZodError"))
        return res.status(400).json({ message: "Invalid delivery query or cursor" });
      throw error;
    }
  }),
);
router.post(
  "/form-delivery-jobs/:id/retry",
  asyncHandler(async (req, res) => {
    const job = await storage.forms.requeueFailedEffectJob(paramString(req.params.id));
    if (!job) return res.status(404).json({ message: "Failed job not found" });
    await storage.activity.log(
      req.user!.id,
      "form_delivery_retry",
      `Retried form delivery ${job.id}`,
    );
    res.json(job);
  }),
);

router.get(
  "/forms",
  asyncHandler(async (_req, res) => {
    res.json(await storage.forms.getAll());
  }),
);

router.get(
  "/forms/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const form = await storage.forms.getById(id);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    res.json(form);
  }),
);

router.get(
  "/forms/:id/submissions",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const form = await storage.forms.getById(id);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    res.json(await storage.forms.getSubmissionsByFormId(id));
  }),
);

router.delete(
  "/forms/:id/submissions/:submissionId",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const submissionId = paramString(req.params.submissionId);
    const form = await storage.forms.getById(id);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    const deleted = await storage.forms.deleteSubmission(id, submissionId);
    if (!deleted) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.json({ success: true });
  }),
);

router.post(
  "/forms",
  asyncHandler(async (req, res) => {
    const parsed = insertCmsFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid form payload", errors: parsed.error.flatten() });
    }

    const existing = await storage.forms.getBySlug(parsed.data.slug);
    if (existing) {
      return res.status(409).json({ message: "A form with that slug already exists" });
    }

    const form = await storage.forms.create(parsed.data);
    res.status(201).json(form);
  }),
);

router.put(
  "/forms/:id",
  asyncHandler(async (req, res) => {
    const parsed = insertCmsFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid form payload", errors: parsed.error.flatten() });
    }

    const id = paramString(req.params.id);
    const current = await storage.forms.getById(id);
    if (!current) {
      return res.status(404).json({ message: "Form not found" });
    }

    const conflicting = await storage.forms.getBySlug(parsed.data.slug);
    if (conflicting && conflicting.id !== id) {
      return res.status(409).json({ message: "A form with that slug already exists" });
    }

    const form = await storage.forms.update(id, parsed.data);
    res.json(form);
  }),
);

router.delete(
  "/forms/:id",
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const existing = await storage.forms.getById(id);
    if (!existing) {
      return res.status(404).json({ message: "Form not found" });
    }

    if (existing.isSystem) {
      return res.status(400).json({ message: "System forms cannot be deleted" });
    }

    const deleted = await storage.forms.delete(id);
    res.json({ success: deleted });
  }),
);

export default router;
