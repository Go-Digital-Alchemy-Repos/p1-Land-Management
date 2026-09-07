import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pageRoot = join(root, "src/pages");

function pages(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return pages(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

const css = readFileSync(join(root, "src/index.css"), "utf8");
assert.match(
  css,
  /\.site-shell\s*\{[\s\S]*?max-width:\s*1240px;[\s\S]*?padding-inline:\s*1\.5rem;/,
  "site-shell must retain the homepage’s 1,240px outer frame and 24px responsive gutters",
);

for (const page of pages(pageRoot)) {
  const source = readFileSync(page, "utf8");
  const relative = page.slice(root.length + 1);
  if (relative === "src/pages/home.tsx") {
    assert.match(source, /site-shell/, "Homepage must define the shared 1,240px baseline");
    continue;
  }
  assert.match(source, /site-shell/, `${relative} must use the shared public-page frame`);
}

const hero = readFileSync(join(root, "src/components/layout/PageHero.tsx"), "utf8");
assert.match(hero, /site-shell/, "PageHero must use the homepage’s shared outer frame");

for (const layoutFile of ["SiteHeader.tsx", "SiteFooter.tsx", "FinalCTA.tsx"]) {
  const source = readFileSync(join(root, "src/components/layout", layoutFile), "utf8");
  assert.match(source, /site-shell/, `${layoutFile} must use the shared public-page frame`);
  assert.doesNotMatch(source, /container\s+mx-auto/, `${layoutFile} must not use Tailwind's independent container width`);
}

console.log("PASS all public route, header, footer and CTA frames use 1,240px width with 24px responsive gutters.");
