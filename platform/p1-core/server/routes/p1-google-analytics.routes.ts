import { Router } from "express";
import { authenticateToken, requireAdminPermission } from "../middleware/auth";
import { GAError, p1GoogleAnalytics } from "../services/p1-google-analytics.service";
import { p1SearchConsole } from "../services/p1-search-console.service";
const router = Router();
router.use(authenticateToken, requireAdminPermission("crm"));
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
const failure = (res: import("express").Response, error: unknown) => {
  const safe = error instanceof GAError ? error : new GAError("provider_unavailable");
  return res
    .status(safe.code === "invalid_date_range" ? 400 : 503)
    .json({ status: "unavailable", code: safe.code, message: safe.message });
};
router.get("/", async (req, res) => {
  try {
    return res.json(await p1GoogleAnalytics.reports(req.query.startDate, req.query.endDate));
  } catch (error) {
    return failure(res, error);
  }
});
router.get("/realtime", async (_req, res) => {
  try {
    return res.json(await p1GoogleAnalytics.realtime());
  } catch (error) {
    return failure(res, error);
  }
});
router.get("/search-console", async (req, res) => {
  try {
    return res.json(await p1SearchConsole.reports(req.query.startDate, req.query.endDate));
  } catch (error) {
    const code = error instanceof GAError ? error.code : "provider_unavailable";
    return res
      .status(code === "invalid_date_range" ? 400 : 503)
      .json({
        status: "unavailable",
        code,
        message:
          code === "invalid_date_range"
            ? "Use a valid date range of at most 93 days."
            : code === "not_configured"
              ? "Search Console reporting is not connected yet."
              : "Search Console reports are temporarily unavailable. Check the property access and API configuration.",
      });
  }
});
export default router;
