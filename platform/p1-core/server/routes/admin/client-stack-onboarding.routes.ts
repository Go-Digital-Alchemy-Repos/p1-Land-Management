import { Router } from "express";
import { asyncHandler } from "../../middleware/error-handler";
import { validateBody } from "../../middleware/validation";
import { storage } from "../../storage";
import {
  clientStackDomainPlanSchema,
  clientStackDnsVerificationEvidenceSchema,
  clientStackIdSchema,
  clientStackReadinessEvidenceSchema,
  createClientStackDomainPlan,
  evaluateClientStackReadiness,
  verifyClientStackDnsRecords,
} from "../../services/client-stack-onboarding.service";

const router = Router();

router.post(
  "/domain-plan",
  validateBody(clientStackDomainPlanSchema),
  asyncHandler(async (req, res) => {
    const plan = createClientStackDomainPlan(req.body);
    const evidence = await storage.clientStackOnboarding.record({
      stackId: plan.stackId,
      kind: "domain_plan",
      payload: plan,
      recordedByUserId: req.user?.id ?? null,
    });
    res.json({ ...plan, evidence: { id: evidence.id, recordedAt: evidence.recordedAt } });
  }),
);

router.post(
  "/dns-verification",
  validateBody(clientStackDnsVerificationEvidenceSchema),
  asyncHandler(async (req, res) => {
    const result = await verifyClientStackDnsRecords({ records: req.body.records });
    const evidence = await storage.clientStackOnboarding.record({
      stackId: req.body.stackId,
      kind: "dns_verification",
      payload: result,
      recordedByUserId: req.user?.id ?? null,
    });
    res.json({ ...result, evidence: { id: evidence.id, recordedAt: evidence.recordedAt } });
  }),
);

router.post(
  "/readiness",
  validateBody(clientStackReadinessEvidenceSchema),
  asyncHandler(async (req, res) => {
    const result = evaluateClientStackReadiness(req.body.checks);
    const evidence = await storage.clientStackOnboarding.record({
      stackId: req.body.stackId,
      kind: "readiness_evaluation",
      payload: result,
      recordedByUserId: req.user?.id ?? null,
    });
    res.json({ ...result, evidence: { id: evidence.id, recordedAt: evidence.recordedAt } });
  }),
);

router.get(
  "/:stackId/evidence",
  asyncHandler(async (req, res) => {
    const stackId = clientStackIdSchema.parse(req.params.stackId);
    res.json(await storage.clientStackOnboarding.list(stackId));
  }),
);

export default router;
