import type { Request, RequestHandler } from "express";
export function isWebsiteOwner(req: Request) {
  const identity = req.dashboardIdentity;
  return Boolean(
    req.user && identity?.active && identity.role === "owner" && identity.ownerAttested,
  );
}
export const requireWebsiteOwner: RequestHandler = (req, res, next) => {
  if (!isWebsiteOwner(req)) {
    res.status(403).json({ message: "Owner access required" });
    return;
  }
  res.setHeader("Cache-Control", "private, no-store");
  next();
};
