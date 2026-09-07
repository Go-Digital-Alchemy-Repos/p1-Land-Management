import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { asyncHandler } from "../../middleware/error-handler";
import { crmLeads, cmsFormSubmissions, cmsFormEffectJobs } from "@shared/schema";
const router = Router();
router.get("/dashboard-stats", asyncHandler(async (_req, res) => {
  const [stages, submissions, failedJobs] = await Promise.all([
    db.select({ stage: crmLeads.stage, count: sql<number>`count(*)::int` }).from(crmLeads).groupBy(crmLeads.stage),
    db.select({ count: sql<number>`count(*)::int` }).from(cmsFormSubmissions),
    db.select({ count: sql<number>`count(*)::int` }).from(cmsFormEffectJobs).where(sql`${cmsFormEffectJobs.status} = 'failed'`),
  ]);
  res.json({ stages, submissions: submissions[0]?.count ?? 0, failedJobs: failedJobs[0]?.count ?? 0 });
}));
export default router;
