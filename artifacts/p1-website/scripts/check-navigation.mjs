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

assert.doesNotMatch(
  header,
  /href=["']\/service-areas["']/,
  "Service Areas must not appear in the desktop or mobile Services menus.",
);

console.log(
  "PASS main navigation keeps Commercial Site Management discoverable; Blog, Gallery, and Service Areas are absent.",
);
