import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SITE_URL = (() => {
  const siteTs = readFileSync(resolve(root, "src/lib/site.ts"), "utf8");
  const match = siteTs.match(/SITE_URL\s*=\s*["'`]([^"'`]+)["'`]/);
  if (!match) throw new Error("Could not find SITE_URL in src/lib/site.ts");
  return match[1].replace(/\/$/, "");
})();

const appTsx = readFileSync(resolve(root, "src/App.tsx"), "utf8");

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

if (routes.length === 0) {
  throw new Error("No routes found in src/App.tsx");
}

// Published CMS dates are added by the production content server. Do not invent modification dates at build time.

const urls = routes
  .map((path) => {
    const loc = `${SITE_URL}${path === "/" ? "/" : path}`;
    const priority = path === "/" ? "1.0" : "0.8";
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <changefreq>weekly</changefreq>`,
      `    <priority>${priority}</priority>`,
      "  </url>",
    ].join("\n");
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const outPath = resolve(root, "public/sitemap.xml");
writeFileSync(outPath, xml, "utf8");
console.log(`Wrote ${routes.length} URLs to public/sitemap.xml`);
