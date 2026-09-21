import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectLocationPage } from "./public-location-page-manifest.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(root, "src/lib/location-pages.json"), "utf8"));
const locationsDir = resolve(root, "src/pages/service-areas");
const projectedRoutes = readdirSync(locationsDir)
  .filter((file) => file.endsWith(".tsx"))
  .flatMap((file) => {
    const source = readFileSync(resolve(locationsDir, file), "utf8");
    return source.includes('from "@/lib/location-pages.json"')
      ? [`/service-areas/${file.slice(0, -4)}`]
      : [];
  });

assert(projectedRoutes.length > 0, "Expected generated location pages to import the canonical manifest");
for (const route of projectedRoutes) {
  const projected = projectLocationPage(manifest, route);
  assert.equal(projected.length, 1, `${route}: client projection must include one location`);
  assert.deepEqual(projected[0], manifest.find((page) => page.path === route), `${route}: client projection must preserve authored content exactly`);
}
console.log(`PASS location page projection: ${projectedRoutes.length} generated routes retain their exact authored content.`);
