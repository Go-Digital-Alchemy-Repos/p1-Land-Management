import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectResponsiveImageManifest } from "./public-image-manifest.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(
  readFileSync(resolve(root, "src/assets/image-manifest.json"), "utf8"),
);
const projected = projectResponsiveImageManifest(source);

const sourceEntries = Object.entries(source);
assert.equal(projected.length, sourceEntries.length);
for (const [[key, image], clientImage] of sourceEntries.map((entry, index) => [entry, projected[index]])) {
  assert(image.variants.every((variant) => variant.format === "webp"), `${key}: compact client variants require WebP-only source variants`);
  assert.equal(image.default, image.variants.at(-1)?.path, `${key}: compact client variants require the final variant to remain the default import target`);
  assert(image.variants.every((variant) => variant.path.endsWith(`-${variant.width}.webp`)), `${key}: compact client variants require width-suffixed WebP paths`);
  const pathPrefix = image.variants[0].path.replace(/\d+\.webp$/, "");
  assert.deepEqual(clientImage, [
    image.width,
    image.height,
    pathPrefix,
    image.variants.map(({ width }) => width),
  ], `${key}: client projection must preserve responsive-image inputs`);
  assert.deepEqual(
    clientImage[3].map((width) => [`${clientImage[2]}${width}.webp`, width]),
    image.variants.map(({ path, width }) => [path, width]),
    `${key}: client projection must reconstruct every responsive variant exactly`,
  );
}
const serialized = JSON.stringify(projected);
for (const privateBuildField of ["sourceHash", "sourceBytes", "quality", "bytes", "format"]) {
  assert(!serialized.includes(`"${privateBuildField}"`), `${privateBuildField}: client projection must omit build-only image metadata`);
}
console.log(`PASS responsive image manifest projection: ${projected.length} images retain only browser delivery metadata.`);
