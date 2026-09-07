import { getBaseUrl } from "../utils/route-helpers";
import { Router } from "express";
import { asyncHandler } from "../middleware/error-handler";
import { authorizeClientFormProxy } from "../services/client-form-proxy-auth";
import { submitManagedFormBySlug } from "../services/forms.service";
import { paramString } from "../utils/params";

const router = Router();

function authorizeRequest(stackId: string, token: string | undefined) {
  return authorizeClientFormProxy({
    requestedStackId: stackId,
    presentedToken: token,
    targetStackId: process.env.CLIENT_STACK_ID,
    expectedToken: process.env.CLIENT_FORM_PROXY_TOKEN,
  });
}

function proxyFormHandler(slug: "contact-form" | "newsletter-signup" | "p1-estimate", source: string) {
  return asyncHandler(async (req, res) => {
    const stackId = paramString(req.params.clientStackId);
    const authorization = authorizeRequest(stackId, req.get("x-client-form-proxy-token"));
    if (!authorization.allowed) {
      res
        .status(authorization.configured ? 403 : 503)
        .json({ message: "Client form submission is temporarily unavailable." });
      return;
    }

    const baseUrl = getBaseUrl(req);
    const result = await submitManagedFormBySlug(slug, req.body, {
      baseUrl,
      source: `client-stack:${stackId}:${source}`,
      idempotencyKey: req.get("idempotency-key") ?? undefined,
    });
    res.status(result.duplicate ? 200 : 201).json({
      message: result.successMessage,
      submissionId: result.submission.id,
    });
  });
}

router.post("/:clientStackId/contact", proxyFormHandler("contact-form", "contact-proxy"));
router.post(
  "/:clientStackId/newsletter-signup",
  proxyFormHandler("newsletter-signup", "newsletter-proxy"),
);

router.post("/:clientStackId/estimate", proxyFormHandler("p1-estimate", "estimate-proxy"));

export default router;
