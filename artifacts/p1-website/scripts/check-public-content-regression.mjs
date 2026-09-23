import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
function assertNoRawMarkdownImports(directory = resolve(root, "src")) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      assertNoRawMarkdownImports(file);
    } else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name)) {
      assert(!/\.md\?raw\b/.test(readFileSync(file, "utf8")), `${file}: raw Markdown imports are not allowed under src/`);
    }
  }
}
assertNoRawMarkdownImports();
const { render } = await import(pathToFileURL(resolve(root, "dist/server/entry-server.js")));
const routes = [...read("src/app-routes.tsx").matchAll(/<Route\s+path="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((path) => !path.includes(":"));
assert(routes.length > 0, "Public-route audit must discover at least one static route");

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

const anchors = (html) => [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map((match) => match[0]);
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

function assertHomepageServiceCards(home) {
  const homeAnchors = anchors(home);
  for (const route of serviceRoutes) {
    const card = homeAnchors.find((anchor) => anchor.includes(`href="${route}"`) && /<img\b/i.test(anchor));
    assert(card, `Homepage must retain the linked, image-bearing service card for ${route}`);
  }
}

const home = render("/").html;
assertHomepageServiceCards(home);

const firstServiceCard = anchors(home).find((anchor) => anchor.includes(`href="${serviceRoutes[0]}"`) && /<img\b/i.test(anchor));
assert(firstServiceCard, "Homepage test fixture requires the first service card");
const homeWithMissingCardImage = home.replace(firstServiceCard, firstServiceCard.replace(/<img\b[^>]*>/i, ""));
assert.throws(() => assertHomepageServiceCards(homeWithMissingCardImage), /image-bearing service card/);

for (const advantage of [
  "Equipment Matched to the Work",
  "Large-Acreage Expertise",
  "Drainage Planning",
  "A Clear Plan Before We Start",
]) {
  assert(home.includes(advantage), `Homepage must retain Why P1 advantage: ${advantage}`);
}

console.log(`PASS ${routes.length} public routes contain no editorial directives; homepage retains 10 linked service cards and four Why P1 advantages.`);
