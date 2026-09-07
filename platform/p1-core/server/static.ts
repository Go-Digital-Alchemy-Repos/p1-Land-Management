import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function faviconMimeType(href: string) {
  const pathOnly = href.split(/[?#]/)[0].toLowerCase();
  if (pathOnly.endsWith(".svg")) return "image/svg+xml";
  if (pathOnly.endsWith(".ico")) return "image/x-icon";
  if (pathOnly.endsWith(".webp")) return "image/webp";
  if (pathOnly.endsWith(".jpg") || pathOnly.endsWith(".jpeg")) return "image/jpeg";
  return "image/png";
}

async function injectBrandingFavicon(template: string) {
  try {
    const branding = await storage.settings.getDecryptedCategory("branding");
    const faviconUrl = branding.favicon_url;
    if (!faviconUrl) return template;

    const href = escapeHtmlAttribute(faviconUrl);
    const type = faviconMimeType(faviconUrl);
    const faviconLink = `<link rel="icon" type="${type}" href="${href}" />`;
    const existingIconLink = /<link\s+rel=["']icon["'][^>]*>/i;

    return existingIconLink.test(template)
      ? template.replace(existingIconLink, faviconLink)
      : template.replace("</head>", `    ${faviconLink}\n  </head>`);
  } catch {
    return template;
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexPath = path.resolve(distPath, "index.html");
  let cachedIndexTemplate: string | null = null;

  async function getIndexTemplate() {
    if (cachedIndexTemplate) return cachedIndexTemplate;
    cachedIndexTemplate = await fs.promises.readFile(indexPath, "utf-8");
    return cachedIndexTemplate;
  }

  app.use(
    "/admin",
    express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
          return;
        }

        if (/\.(js|css|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|avif|ico)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  app.use("/admin/assets", (_req, res) => res.status(404).send("Not found"));

  // The public website is served by the gateway; only dashboard routes fall through.
  app.use("/admin{/*path}", async (req, res) => {
    const template = await injectBrandingFavicon(await getIndexTemplate());

    res.setHeader(
      "Cache-Control",
      req.path.startsWith("/admin") ||
        req.path.startsWith("/auth") ||
        req.path.startsWith("/therapist")
        ? "private, no-store, max-age=0"
        : "no-cache",
    );
    res.type("html").send(template);
  });
}
