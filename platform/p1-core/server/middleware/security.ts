import type { Request, Response, NextFunction, RequestHandler } from "express";
import helmet from "helmet";
import { loadClientSiteManifest } from "../services/client-site-manifest.service";
import rateLimit from "express-rate-limit";
import { logger } from "../utils/logger";

const isDev = process.env.NODE_ENV !== "production";
const originCheckExemptPaths = new Set<string>();

export function enforceRequiredSecrets() {
  if (isDev) return;

  const required: Record<string, string | undefined> = {
    SESSION_SECRET: process.env.SESSION_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    SETUP_TOKEN: process.env.SETUP_TOKEN,
    APP_URL: process.env.APP_URL,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    logger.app.error(`FATAL: Missing required secrets in production: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (process.env.SESSION_SECRET === "dev-secret-change-me" || (process.env.SESSION_SECRET?.length ?? 0) < 32) {
    logger.app.error("FATAL: SESSION_SECRET must not use the dev default in production");
    process.exit(1);
  }
}

export function securityHeaders(): RequestHandler {
  return createSecurityHeaders();
}

// Only an explicitly configured, fully validated manifest may extend frame-src.
// An absent manifest keeps standalone Core restricted; an invalid one rejects startup.
export async function configuredSecurityHeaders(
  manifestPath: string | undefined,
  corePlatformVersion: string,
): Promise<RequestHandler> {
  if (manifestPath === undefined) return securityHeaders();
  const manifest = await loadClientSiteManifest(manifestPath, corePlatformVersion);
  return createSecurityHeaders(manifest.origins.publicSite);
}

function createSecurityHeaders(publicSiteOrigin?: string): RequestHandler {
  return helmet({
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",

          "https://www.googletagmanager.com",
          "https://static.cloudflareinsights.com",
          "https://connect.facebook.net",
          "https://analytics.tiktok.com",
          "https://static.ads-twitter.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://unpkg.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.r2.cloudflarestorage.com",
          "https://*.r2.dev",
          "https://*.tile.openstreetmap.org",
          "https://unpkg.com",
          "https://tiles.openfreemap.org",
          "https://images.unsplash.com",
          "https://www.facebook.com",
          "https://analytics.tiktok.com",
          "https://t.co",
        ],
        connectSrc: [
          "'self'",

          "https://www.google-analytics.com",
          "https://region1.google-analytics.com",
          "https://www.googletagmanager.com",
          "https://cloudflareinsights.com",
          "https://*.r2.cloudflarestorage.com",
          "https://*.r2.dev",
          "https://*.tile.openstreetmap.org",
          "https://tiles.openfreemap.org",
          "https://www.facebook.com",
          "https://connect.facebook.net",
          "https://analytics.tiktok.com",
          "https://business-api.tiktok.com",
          "https://analytics.twitter.com",
          "https://static.ads-twitter.com",
        ],
        frameSrc: [
          "'self'",


          ...(publicSiteOrigin ? [publicSiteOrigin] : []),
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        mediaSrc: ["'self'", "blob:", "https://*.r2.cloudflarestorage.com", "https://*.r2.dev"],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }) as unknown as RequestHandler;
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  skip: () => isDev,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset requests. Please try again later." },
  skip: () => isDev,
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset attempts. Please try again later." },
  skip: () => isDev,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts. Please try again later." },
  skip: () => isDev,
});

export const guestMessageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many messages. Please try again later." },
  skip: () => isDev,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
  skip: () => isDev,
});

export const crmInboundRateLimitPolicy = {
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: { message: "Too many CRM intake requests. Please try again shortly." },
};

export const crmInboundLimiter = rateLimit({
  ...crmInboundRateLimitPolicy,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});

export const ecommerceCheckoutRateLimitPolicy = {
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { message: "Too many checkout attempts. Please try again shortly." },
};

export const ecommerceOrderLookupRateLimitPolicy = {
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { message: "Too many order lookup attempts. Please try again shortly." },
};

export const ecommercePricingRateLimitPolicy = {
  windowMs: 10 * 60 * 1000,
  max: 120,
  message: { message: "Too many ecommerce pricing requests. Please try again shortly." },
};

export const ecommerceCheckoutLimiter = rateLimit({
  ...ecommerceCheckoutRateLimitPolicy,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});

export const ecommerceOrderLookupLimiter = rateLimit({
  ...ecommerceOrderLookupRateLimitPolicy,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});

export const ecommercePricingLimiter = rateLimit({
  ...ecommercePricingRateLimitPolicy,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});

export function noStorePrivateResponse(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
}

function normalizeOrigin(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    // Intentionally silent: malformed origin strings are expected from some clients and should be treated as null
    return null;
  }
}

function getRequestOrigin(req: Request): string | null {
  const origin = req.headers["origin"] as string | undefined;
  if (origin) return normalizeOrigin(origin);

  const referer = req.headers["referer"] as string | undefined;
  if (referer) return normalizeOrigin(referer);

  return null;
}

function getTrustedOrigins(): Set<string> {
  const origins = new Set<string>();

  if (process.env.APP_URL) {
    const normalized = normalizeOrigin(process.env.APP_URL);
    if (normalized) origins.add(normalized);
  }

  if (process.env.TRUSTED_ORIGINS) {
    for (const raw of process.env.TRUSTED_ORIGINS.split(",")) {
      const normalized = normalizeOrigin(raw.trim());
      if (normalized) origins.add(normalized);
    }
  }

  return origins;
}

export const originCheck: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  if (originCheckExemptPaths.has(req.path)) {
    return next();
  }

  if (req.path === "/api/crm/leads") {
    return next();
  }

  if (isDev) {
    return next();
  }

  const source = getRequestOrigin(req);

  if (!source) {
    res.status(403).json({ message: "Forbidden: missing origin" });
    return;
  }

  const trusted = getTrustedOrigins();
  const host = req.get("host");
  if (host) {
    trusted.add(`https://${host}`);
  }

  if (trusted.has(source)) {
    return next();
  }

  res.status(403).json({ message: "Forbidden: untrusted origin" });
};
