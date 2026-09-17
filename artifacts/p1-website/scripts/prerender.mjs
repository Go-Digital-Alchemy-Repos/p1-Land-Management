import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

process.env.NODE_ENV = "production";
process.env.PORT = process.env.PORT || "5000";
process.env.BASE_PATH = process.env.BASE_PATH || "/";

const SITE_URL = (() => {
  const siteTs = readFileSync(resolve(root, "src/lib/site.ts"), "utf8");
  const match = siteTs.match(/SITE_URL\s*=\s*["'`]([^"'`]+)["'`]/);
  if (!match) throw new Error("Could not find SITE_URL in src/lib/site.ts");
  return match[1].replace(/\/$/, "");
})();

const BUSINESS_NAME = (() => {
  const siteTs = readFileSync(resolve(root, "src/lib/site.ts"), "utf8");
  const match = siteTs.match(/BUSINESS_NAME\s*=\s*["'`]([^"'`]+)["'`]/);
  if (!match) throw new Error("Could not find BUSINESS_NAME in src/lib/site.ts");
  return match[1];
})();

// Extract static routes from the shared router (same approach as generate-sitemap.mjs)
const appTsx = readFileSync(resolve(root, "src/app-routes.tsx"), "utf8");
const routes = [];
const seen = new Set();
const routeRegex = /<Route\s+path="([^"]+)"/g;
let m;
while ((m = routeRegex.exec(appTsx)) !== null) {
  const path = m[1];
  if (path.includes(":") || path.includes("*")) continue;
  if (seen.has(path)) continue;
  seen.add(path);
  routes.push(path);
}
if (routes.length === 0) throw new Error("No routes found in src/app-routes.tsx");

// 1. Build the SSR bundle
const { build } = await import("vite");
await build({
  configFile: resolve(root, "vite.config.ts"),
  logLevel: "warn",
  build: {
    ssr: "src/entry-server.tsx",
    outDir: resolve(root, "dist/server"),
    emptyOutDir: true,
  },
});

// 2. Load the server renderer and the built client HTML template
const entryPath = resolve(root, "dist/server/entry-server.js");
if (!existsSync(entryPath)) {
  throw new Error(`SSR bundle not found at ${entryPath}`);
}
const { render } = await import(pathToFileURL(entryPath).href);

const templatePath = resolve(root, "dist/public/index.html");
if (!existsSync(templatePath)) {
  throw new Error(
    `Client build template not found at ${templatePath} — run "vite build" first`,
  );
}
const template = readFileSync(templatePath, "utf8");

const HEAD_START = "<!--seo-head-start-->";
const HEAD_END = "<!--seo-head-end-->";
if (!template.includes(HEAD_START) || !template.includes(HEAD_END)) {
  throw new Error("index.html is missing the seo-head markers");
}
if (!template.includes('<div id="root"></div>')) {
  throw new Error('index.html is missing <div id="root"></div>');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonLdScript(obj) {
  const json = JSON.stringify(obj).replace(/</g, "\\u003c");
  return `<script type="application/ld+json" data-seo-jsonld>${json}</script>`;
}

function buildHeadHtml(head, path) {
  const url = SITE_URL + (path === "/" ? "/" : path);
  const img = head.image
    ? head.image.startsWith("http")
      ? head.image
      : SITE_URL + head.image
    : `${SITE_URL}/opengraph.jpg`;
  const robots = head.noindex ? "noindex, follow" : "index, follow";

  const lines = [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:title" content="${escapeHtml(head.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(head.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(img)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(BUSINESS_NAME)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(head.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(head.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(img)}" />`,
  ];

  if (head.jsonLd) {
    const items = Array.isArray(head.jsonLd) ? head.jsonLd : [head.jsonLd];
    for (const item of items) {
      lines.push(jsonLdScript(item));
    }
  }

  return lines.join("\n    ");
}

// 3. Render each route and write static HTML
let count = 0;
const failures = [];
for (const path of routes) {
  let result;
  try {
    result = render(path);
  } catch (err) {
    failures.push({ path, err });
    continue;
  }
  const { html, head } = result;
  if (!head) {
    failures.push({
      path,
      err: new Error("No SEO head collected — page may be missing <SEO />"),
    });
    continue;
  }

  const startIdx = template.indexOf(HEAD_START);
  const endIdx = template.indexOf(HEAD_END) + HEAD_END.length;
  const headHtml = `${HEAD_START}\n    ${buildHeadHtml(head, path)}\n    ${HEAD_END}`;
  const page = (
    template.slice(0, startIdx) +
    headHtml +
    template.slice(endIdx)
  ).replace('<div id="root"></div>', `<div id="root">${html}</div>`);

  if (path === "/") {
    writeFileSync(resolve(root, "dist/public/index.html"), page, "utf8");
  } else {
    // Write both <route>/index.html (for trailing-slash URLs) and
    // <route>.html (static servers resolve extensionless URLs to this
    // before falling back to the SPA rewrite).
    const dirFile = resolve(root, "dist/public", `.${path}`, "index.html");
    mkdirSync(dirname(dirFile), { recursive: true });
    writeFileSync(dirFile, page, "utf8");
    writeFileSync(resolve(root, "dist/public", `.${path}.html`), page, "utf8");
  }
  count++;
}

if (failures.length > 0) {
  for (const { path, err } of failures) {
    console.error(`Prerender failed for ${path}:`, err.message || err);
  }
  process.exit(1);
}

console.log(`Prerendered ${count} routes to dist/public`);
