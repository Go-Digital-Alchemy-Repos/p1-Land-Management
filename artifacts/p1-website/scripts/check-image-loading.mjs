import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(resolve(root, path), "utf8");

const home = source("src/pages/home.tsx");
assert.match(home, /src=\{heroImg\}[\s\S]*?fetchPriority="high"[\s\S]*?decoding="async"/, "homepage hero must keep high loading priority");
for (const image of ["s.img", "featureImg", "testimonialImg"]) {
  assert.match(home, new RegExp(`src=\\{${image.replace(".", "\\.")}\\}[\\s\\S]{0,180}?loading="lazy"[\\s\\S]{0,80}?decoding="async"`), `homepage ${image} must defer below-fold media`);
}

const pageHero = source("src/components/layout/PageHero.tsx");
assert.match(pageHero, /src=\{image\}[\s\S]*?fetchPriority="high"[\s\S]*?decoding="async"/, "interior page heroes must retain high loading priority");

const finalCta = source("src/components/layout/FinalCTA.tsx");
assert.match(finalCta, /src=\{ctaImg\}[\s\S]*?loading="lazy"[\s\S]*?decoding="async"/, "footer CTA imagery must defer");

const responsiveImages = source("src/lib/responsive-images.ts");
assert.match(responsiveImages, /optimized\/\*\*\/\*\.webp/, "responsive image lookup must use WebP assets only");
assert.doesNotMatch(responsiveImages, /avif/i, "responsive image lookup must not package AVIF assets");

const optimizer = source("scripts/optimize-images.mjs");
assert.match(optimizer, /for \(const format of \['webp'\]\)/, "image optimizer must generate WebP variants only");

const commercial = source("src/pages/commercial.tsx");
assert.match(commercial, /src=\{hero\}[\s\S]*?fetchPriority="high"[\s\S]*?decoding="async"/, "commercial hero must retain high loading priority");
assert.match(commercial, /src=\{water\}[\s\S]*?loading="lazy"[\s\S]*?decoding="async"/, "commercial supporting image must defer");

for (const path of [
  "src/pages/blog/index.tsx",
  "src/pages/service-areas/index.tsx",
  "src/pages/service-areas/charlotte-north-carolina.tsx",
  "src/pages/service-areas/upstate-south-carolina.tsx",
]) {
  assert.match(source(path), /loading="lazy"\s+decoding="async"/, `${path} must defer supporting cards`);
}

console.log("PASS hero images use high priority; audited supporting images lazy-load and decode asynchronously.");
