import { Router } from "express";
import { z } from "zod";
import { requireBusinessCapability } from "../middleware/auth";
import { FederationError } from "../services/federation-client";
import { analyticsReport, realtimeReport, searchConsoleReport } from "./p1-google-analytics.routes";

const body = z.object({ grantId: z.string().uuid() }).strict();
const dates = z
  .object({ startDate: z.string().date().optional(), endDate: z.string().date().optional() })
  .strict();
import {
  authenticateMarketingService,
  resolveMarketingActor,
} from "../middleware/marketing-service";
export { validMarketingServiceRequest } from "../middleware/marketing-service";

const router = Router();
router.use(authenticateMarketingService);
router.use(async (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  if (req.method !== "POST") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (!["/analytics", "/realtime", "/search-console"].includes(req.path)) {
    res.status(404).json({ message: "Report not found" });
    return;
  }
  const parsed = body.safeParse(req.body);
  if (!parsed.success || !dates.safeParse(req.query).success) {
    res.status(400).json({ message: "Invalid reporting request" });
    return;
  }
  try {
    const context = await resolveMarketingActor(parsed.data.grantId);
    req.user = context.user;
    req.dashboardIdentity = context.identity;
    next();
  } catch (error) {
    res
      .status(error instanceof FederationError ? error.status : 503)
      .json({ message: "Website reporting access unavailable" });
  }
});
router.post("/analytics", requireBusinessCapability("marketing.analytics.view"), analyticsReport);
router.post("/realtime", requireBusinessCapability("marketing.analytics.view"), realtimeReport);
router.post(
  "/search-console",
  requireBusinessCapability("marketing.search-console.view"),
  searchConsoleReport,
);
export default router;
