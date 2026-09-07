import { federationEnabled, FederationError } from "../services/federation-client";
import { FEDERATION_COOKIE, federationConsumer, hasFederationHistory } from "../services/federation-runtime";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHmac, timingSafeEqual } from "crypto";
import type { User } from "@shared/schema";
import {
  AdminPermission,
  type UserRole,
  type AdminPermission as AdminPermissionType,
} from "@shared/types";

const isDev = process.env.NODE_ENV !== "production";
const JWT_SECRET = process.env.SESSION_SECRET || (isDev ? "dev-secret-change-me" : "");
const JWT_EXPIRY = "7d";
const COOKIE_NAME = "p1_admin_token";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  sessionVersion: string;
}

function getSessionVersion(user: User): string {
  return createHmac("sha256", JWT_SECRET).update(user.password).digest("base64url");
}

function hasCurrentSessionVersion(payload: JwtPayload, user: User): boolean {
  if (typeof payload.sessionVersion !== "string") return false;

  const tokenVersion = Buffer.from(payload.sessionVersion);
  const currentVersion = Buffer.from(getSessionVersion(user));
  return (
    tokenVersion.length === currentVersion.length && timingSafeEqual(tokenVersion, currentVersion)
  );
}

function normalizePermissions(user: User | undefined): AdminPermissionType[] {
  if (!user) return [];
  if (user.role === "admin") {
    return [
      AdminPermission.DIRECTORY,
      AdminPermission.CONTENT,
      AdminPermission.DESIGN,
      AdminPermission.CRM,
    ];
  }

  if (!Array.isArray(user.adminPermissions)) return [];

  return user.adminPermissions.filter(
    (permission): permission is AdminPermissionType =>
      permission === AdminPermission.DIRECTORY ||
      permission === AdminPermission.CONTENT ||
      permission === AdminPermission.DESIGN ||
      permission === AdminPermission.CRM,
  );
}

export function hasAdminPermission(
  user: User | undefined,
  permission: AdminPermissionType,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "editor") return false;
  return normalizePermissions(user).includes(permission);
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionVersion: getSessionVersion(user),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function setTokenCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearTokenCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export const authenticateToken: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (federationEnabled() || req.cookies?.[FEDERATION_COOKIE]) {
    try {
      if (!federationEnabled()) throw new FederationError(401, "federation_disabled");
      const id = await federationConsumer().authenticate(req.cookies?.[FEDERATION_COOKIE]);
      const { storage } = await import("../storage/index");
      const user = await storage.users.getUser(id);
      if (!user || user.isSuspended || !["admin", "editor"].includes(user.role)) throw new FederationError(403, "federation_local_access_denied");
      req.user = user; next();
    } catch (e) { res.status(e instanceof FederationError ? e.status : 503).json({message:e instanceof FederationError ? e.code : "federation_unavailable"}); }
    return;
  }
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const { storage } = await import("../storage/index");
    const user = await storage.users.getUser(decoded.userId);
    if (!user || user.isSuspended || !hasCurrentSessionVersion(decoded, user) || await hasFederationHistory(user.id)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const optionalAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  // Public optional auth never performs privileged draft reads during outage.
  if (federationEnabled() || req.cookies?.[FEDERATION_COOKIE]) { next(); return; }
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    next();
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const { storage } = await import("../storage/index");
    const user = await storage.users.getUser(decoded.userId);
    if (user && !user.isSuspended && hasCurrentSessionVersion(decoded, user) && !await hasFederationHistory(user.id)) {
      req.user = user;
    }
  } catch {
    // Intentionally silent: optionalAuth should not reject requests with invalid/expired tokens — the user simply remains unauthenticated
  }
  next();
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
}

export function requireAdminPermission(...permissions: AdminPermissionType[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (req.user.role !== "admin" && req.user.role !== "editor") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    if (
      permissions.length === 0 ||
      permissions.some((permission) => hasAdminPermission(req.user, permission))
    ) {
      next();
      return;
    }

    res.status(403).json({ message: "Forbidden" });
  };
}
