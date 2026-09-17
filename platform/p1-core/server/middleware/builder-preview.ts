import type { RequestHandler } from "express";
import helmet from "helmet";
import { CMS_BUILDER_PREVIEW_PATH } from "../../shared/cms-builder/preview";
import { federationConfig, federationEnabled } from "../services/federation-client";

/** Uses the same validated identity issuer as the CMS bridge. Never trust a
 * request origin, host, query parameter or forwarded header for framing. */
export function builderPreviewPolicy(env = process.env): RequestHandler {
  const enabled = env.CORE_BUILDER_PREVIEW_ENABLED === "true";
  if (enabled && !federationEnabled(env)) throw new Error("Builder preview requires federation");
  const origin = enabled ? federationConfig(env).issuer : null;
  const headers = origin
    ? helmet({
        xFrameOptions: false,
        referrerPolicy: { policy: "no-referrer" },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: [
              "'self'",
              "data:",
              "blob:",
              "https://*.r2.cloudflarestorage.com",
              "https://*.r2.dev",
              "https://images.unsplash.com",
            ],
            mediaSrc: ["'self'", "blob:", "https://*.r2.cloudflarestorage.com", "https://*.r2.dev"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            frameAncestors: [origin],
            objectSrc: ["'none'"],
            baseUri: ["'none'"],
            formAction: ["'none'"],
            sandbox: ["allow-scripts", "allow-same-origin"],
          },
        },
      })
    : null;
  return (req, res, next) => {
    if (req.path !== CMS_BUILDER_PREVIEW_PATH) return next();
    if (!origin || !headers || !["GET", "HEAD"].includes(req.method)) {
      res.status(404).send("Preview unavailable");
      return;
    }
    res.removeHeader("X-Frame-Options");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.locals.builderPreviewOrigin = origin;
    headers(req, res, next);
  };
}

export function builderPreviewHtml(template: string, origin: string): string {
  const safe = origin
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return template.replace(
    "<!--APP_DYNAMIC_HEAD-->",
    `<meta name="p1-builder-preview-origin" content="${safe}" />`,
  );
}
