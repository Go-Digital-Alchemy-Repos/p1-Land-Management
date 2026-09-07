import { getCorePlatformAdminOrigin } from "../config/client-stack-origins";
import type { Request, Response } from "express";

export function getBaseUrl(req: Request): string {
  const configured = getCorePlatformAdminOrigin();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("APP_URL must be configured for public links");
  return `${req.protocol}://${req.get("host")}`;
}

export function notFound(res: Response, entity: string): void {
  res.status(404).json({ message: `${entity} not found` });
}

export function conflict(res: Response, message: string): void {
  res.status(409).json({ message });
}
