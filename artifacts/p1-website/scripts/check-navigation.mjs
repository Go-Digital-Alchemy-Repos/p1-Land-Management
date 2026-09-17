import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const header = readFileSync(
  resolve(root, "src/components/layout/SiteHeader.tsx"),
  "utf8",
);

assert.match(
  header,
  /const services = \[\s*\{ name: "Commercial Site Management", href: "\/commercial" \}/,
  "Commercial Site Management must remain the first Services-menu item.",
);

for (const retiredMainNavPath of ["/blog", "/gallery"]) {
  assert.doesNotMatch(
    header,
    new RegExp(`href=["']${retiredMainNavPath}["']`),
    `${retiredMainNavPath} must not return to the main navigation.`,
  );
}

assert.doesNotMatch(
  header,
  /View All Services/,
  "The retired Services-menu item must not return.",
);

const serviceAreasLinks = [...header.matchAll(/<Link href="\/service-areas"[^>]*>/g)];
assert.equal(
  serviceAreasLinks.length,
  2,
  "Service Areas must appear once in each desktop and mobile Services menu.",
);
for (const link of serviceAreasLinks) {
  const context = header.slice(Math.max(0, link.index - 220), link.index + 220);
  assert.match(
    context,
    /className="font-bold text-primary[^"]*"/,
    "Service Areas must retain the requested bold primary styling on its menu item or link.",
  );
}

for (const servicesMap of header.matchAll(/\{services\.map\(\(s\) => \(/g)) {
  const mapEnd = header.indexOf("))}", servicesMap.index);
  const serviceAreas = header.indexOf('href="/service-areas"', servicesMap.index);
  assert.ok(
    mapEnd !== -1 && serviceAreas > mapEnd,
    "Service Areas must remain after all service items in each Services menu.",
  );
}

console.log(
  "PASS main navigation keeps Commercial Site Management discoverable; Blog/Gallery absent; Service Areas is the final bold primary Services item.",
);
