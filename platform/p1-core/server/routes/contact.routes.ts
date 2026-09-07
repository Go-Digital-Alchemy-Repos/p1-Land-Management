import { getBaseUrl } from "../utils/route-helpers";
import { Router } from "express";
import { asyncHandler } from "../middleware/error-handler";
import { submitManagedFormBySlug } from "../services/forms.service";

const router = Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const baseUrl = getBaseUrl(req);
    const result = await submitManagedFormBySlug("contact-form", req.body, {
      baseUrl,
      source: "contact-route",
      idempotencyKey: req.get("idempotency-key") ?? undefined,
    });
    res.status(201).json({ message: result.successMessage });
  }),
);

export default router;
