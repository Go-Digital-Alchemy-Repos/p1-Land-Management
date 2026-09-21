import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const { render } = await import(pathToFileURL(resolve(root, "dist/server/entry-server.js")));
const routes = [...read("src/app-routes.tsx").matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((path) => !path.includes(":"));

const editorialDirectives = [
  "hero stat row",
  "replace current three",
  "service cards (10)",
  "keep the current card grid",
  "replace card text",
  "credentials strip",
  "section 2.4",
];

const layout = read("src/components/layout/Layout.tsx");
assert(!layout.includes("ContentPlanPage"), "Layout must render route children, not the generic content-plan renderer");
assert(layout.includes("{children}"), "Layout must preserve page-owned presentation");

for (const path of routes) {
  const html = render(path).html.toLowerCase();
  for (const directive of editorialDirectives) {
    assert(!html.includes(directive), `${path}: leaked editorial directive: ${directive}`);
  }
}

const home = render("/").html;
const serviceRoutes = [
  "/services/commercial-landscaping",
  "/services/commercial-snow-ice-management",
  "/services/industrial-agricultural",
  "/services/land-clearing",
  "/services/grading-site-preparation",
  "/services/drainage",
  "/services/turf-installation-seeding",
  "/services/tree-services",
  "/services/pond-waterway-management",
  "/services/property-reconstruction",
];

for (const route of serviceRoutes) {
  const card = new RegExp(`<a\\b[^>]*href="${route}"[^>]*>[\\s\\S]*?<img\\b`, "i");
  assert(card.test(home), `Homepage must retain the linked, image-bearing service card for ${route}`);
}

for (const advantage of [
  "Equipment Matched to the Work",
  "Large-Acreage Expertise",
  "Drainage Planning",
  "A Clear Plan Before We Start",
]) {
  assert(home.includes(advantage), `Homepage must retain Why P1 advantage: ${advantage}`);
}

console.log(`PASS ${routes.length} public routes contain no editorial directives; homepage retains 10 linked service cards and four Why P1 advantages.`);
