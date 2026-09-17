import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { requireBusinessCapability } from "../middleware/auth";
import { federationConsumer } from "../services/federation-runtime";
import { federationEnabled, FederationError } from "../services/federation-client";
import { analyticsReport, realtimeReport, searchConsoleReport } from "./p1-google-analytics.routes";

export function validMarketingServiceRequest(
  headers: { authorization?: string; cookie?: string; origin?: string; "sec-fetch-site"?: string },
  key: string,
) {
  if (
    headers.cookie ||
    headers.origin ||
    headers["sec-fetch-site"] ||
    !/^[A-Za-z0-9_-]{43,}$/.test(key)
  )
    return false;
  const supplied = headers.authorization || "";
  return timingSafeEqual(
    createHash("sha256").update(supplied).digest(),
    createHash("sha256").update(`Bearer ${key}`).digest(),
  );
}
const body = z.object({ grantId: z.string().uuid() }).strict();
const dates = z
  .object({ startDate: z.string().date().optional(), endDate: z.string().date().optional() })
  .strict();
const router = Router();
router.use(async (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  if (
    req.method !== "POST" ||
    !federationEnabled() ||
    !validMarketingServiceRequest(req.headers, process.env.DASHBOARD_MARKETING_SERVICE_KEY || "")
  ) {
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
    const context = await federationConsumer().authenticateServiceGrant(parsed.data.grantId);
    const { storage } = await import("../storage/index");
    const user = await storage.users.getUser(context.userId);
    if (!user || user.isSuspended) throw new FederationError(403, "federation_local_access_denied");
    req.user = user;
    req.dashboardIdentity = context.grant;
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
