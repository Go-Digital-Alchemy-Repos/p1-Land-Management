import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { federationConsumer } from "../services/federation-runtime";
import { federationEnabled, FederationError } from "../services/federation-client";

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
  return timingSafeEqual(
    createHash("sha256")
      .update(headers.authorization || "")
      .digest(),
    createHash("sha256").update(`Bearer ${key}`).digest(),
  );
}

/** Service identity is never sufficient: every request also needs a fresh user grant. */
export const authenticateMarketingService: RequestHandler = async (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  if (
    !federationEnabled() ||
    !validMarketingServiceRequest(req.headers, process.env.DASHBOARD_MARKETING_SERVICE_KEY || "")
  ) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
};

export async function resolveMarketingActor(grantId: string) {
  const context = await federationConsumer().authenticateServiceGrant(grantId);
  const { storage } = await import("../storage/index");
  const user = await storage.users.getUser(context.userId);
  if (!user || user.isSuspended) throw new FederationError(403, "federation_local_access_denied");
  return { user, identity: context.grant };
}
