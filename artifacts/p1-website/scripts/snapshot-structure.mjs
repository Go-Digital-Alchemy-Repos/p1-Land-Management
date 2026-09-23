import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDocument } from "htmlparser2";

const root = resolve(import.meta.dirname, "..");
const baselineFile = resolve(import.meta.dirname, "structure-baseline.json");
const mode = process.argv[2];
assert(["--write", "--check"].includes(mode), "Use --write or --check");

const routes = [
  ...readFileSync(resolve(root, "src/app-routes.tsx"), "utf8").matchAll(
    /<Route\s+path="([^"]+)"/g,
  ),
]
  .map((match) => match[1])
  .filter((path) => !path.includes(":") && !path.includes("*"));
assert(routes.length > 0, "No static routes found");
assert.equal(routes.length, new Set(routes).size, "Duplicate static routes");
const locationRoutes = new Set(
  JSON.parse(
    readFileSync(resolve(root, "src/lib/location-pages.json"), "utf8"),
  ).map((page) => page.path),
);

const elements = (node) =>
  (node.children ?? []).filter((child) => typeof child.name === "string");
const find = (node, predicate) => {
  if (predicate(node)) return node;
  for (const child of elements(node)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
};
const text = (node) =>
  node.type === "text" ? node.data : (node.children ?? []).map(text).join("");
const words = (node) => text(node).replace(/\s+/g, " ").trim();
const classes = (node) =>
  (node.attribs?.class ?? "").trim().replace(/\s+/g, " ");

function stableImageSrc(src) {
  if (!src?.startsWith("/assets/")) return src ?? "";
  return src.replace(/-([A-Za-z0-9_-]{8,10})(?=\.[^./]+$)/, (match, hash) =>
    /[A-Z0-9_]/.test(hash) ? "" : match,
  );
}

function nodePath(parentPath, index) {
  return `${parentPath}/${index}`;
}

function capture(path) {
  const file = resolve(
    root,
    "dist/public",
    path === "/" ? "index.html" : `.${path}/index.html`,
  );
  const document = parseDocument(readFileSync(file, "utf8"), {
    decodeEntities: true,
  });
  const main = find(document, (node) => node.name === "main");
  assert(main, `${path}: missing <main>`);

  const skeleton = [];
  const images = [];
  const markers = {
    hero: [],
    map: [],
    sidebar: [],
    ctaBand: [],
    serviceCards: [],
    faq: [],
  };
  const semantic = new Set(["section", "article", "aside", "nav"]);

  function visit(node, depth, position) {
    const reviewSection =
      node.attribs?.["aria-labelledby"] === "customer-reviews-heading";
    const component = node.attribs?.["data-component"];
    const signature = `${node.name}${component ? `[${component}]` : ""}${classes(node) ? `.${classes(node)}` : ""}`;
    if (depth <= 3 || semantic.has(node.name)) {
      skeleton.push({ position, depth, signature });
    }
    if (node.name === "img") {
      images.push({
        position,
        src: stableImageSrc(node.attribs?.src),
        width: node.attribs?.width ?? null,
        height: node.attribs?.height ?? null,
      });
    }
    if (node.name === "section" && position === "/0")
      markers.hero.push(position);
    if (classes(node).split(" ").includes("service-area-map"))
      markers.map.push(position);
    if (node.name === "aside") markers.sidebar.push(position);
    if (component === "cta-band") markers.ctaBand.push(position);
    if (node.attribs?.["data-content-section"] === "Services Grid") {
      elements(node).forEach((child, index) => {
        if (
          child.name === "a" &&
          find(child, (candidate) => candidate.name === "img")
        ) {
          markers.serviceCards.push(nodePath(position, index));
        }
      });
    }
    if (node.attribs?.["data-content-type"] === "faq")
      markers.faq.push(position);
    if (reviewSection) return; // API reviews may change card count without changing this section's place.
    let children = elements(node);
    if (locationRoutes.has(path) && classes(node).includes("space-y-14")) {
      // LocationPage.sections is an approved variable-length list. Preserve its first
      // template instance, then compare the FAQ and links at stable positions.
      let sawSection = false;
      children = children.filter((child) => {
        const isDataSection =
          child.name === "section" &&
          classes(child) === "max-w-4xl" &&
          !find(
            child,
            (candidate) => candidate.attribs?.["data-content-type"] === "faq",
          );
        if (!isDataSection) return true;
        if (sawSection) return false;
        sawSection = true;
        return true;
      });
    }
    children.forEach((child, index) =>
      visit(child, depth + 1, nodePath(position, index)),
    );
  }
  elements(main).forEach((child, index) => visit(child, 1, `/${index}`));

  let hero = null;
  if (path === "/") {
    const sections = elements(main).filter((node) => node.name === "section");
    assert(sections.length >= 2, "Homepage hero and trust strip are required");
    const heroSection = sections[0];
    const heading = find(heroSection, (node) => node.name === "h1");
    const subheading = find(heroSection, (node) => node.name === "p");
    const kicker = find(
      heroSection,
      (node) => node.name === "span" && classes(node).includes("uppercase"),
    );
    const buttons = [];
    function collectLinks(node) {
      if (
        node.name === "a" &&
        (node.attribs?.href?.startsWith("/contact") ||
          node.attribs?.href?.startsWith("tel:"))
      )
        buttons.push(words(node));
      for (const child of elements(node)) collectLinks(child);
    }
    collectLinks(heroSection);
    hero = {
      eyebrow: kicker ? words(kicker) : "",
      h1: words(heading),
      subheading: words(subheading),
      buttons,
      statRow: elements(
        find(
          sections[1],
          (node) => node.name === "div" && classes(node).includes("grid"),
        ) ?? sections[1],
      ).map(words),
    };
    assert.equal(
      hero.h1,
      "First Impressions Start at the Curb.",
      "Homepage H1 must match Owner-approved copy",
    );
    assert.equal(
      hero.subheading,
      "Commercial landscaping and exterior grounds maintenance that keep your property looking professional, welcoming, and well cared for.",
      "Homepage subheading must match Owner-approved copy",
    );
  }
  return { images, skeleton, markers, ...(hero ? { hero } : {}) };
}

const current = {
  version: 1,
  source: "origin/main SSR prerender with source defaults",
  baseCommit: "6c9cf25a66d8c0fe76bc61a6b1c6ee54f7c63469",
  exclusions: [
    "Google review section descendants (live API can replace cards and counts)",
    "text outside homepage hero",
    "asset filename hashes",
  ],
  routes: Object.fromEntries(routes.map((path) => [path, capture(path)])),
};

if (mode === "--write") {
  writeFileSync(baselineFile, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Wrote structure baseline for ${routes.length} routes`);
} else {
  const expected = JSON.parse(readFileSync(baselineFile, "utf8"));
  const failures = [];
  for (const path of new Set([
    ...Object.keys(expected.routes),
    ...Object.keys(current.routes),
  ])) {
    const before = expected.routes[path];
    const after = current.routes[path];
    if (!before || !after) {
      failures.push(`${path}: route ${before ? "removed" : "added"}`);
      continue;
    }
    for (const key of ["images", "skeleton", "markers", "hero"]) {
      const oldValue = before[key] ?? null;
      const newValue = after[key] ?? null;
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        const count = Math.max(oldValue.length, newValue.length);
        for (let index = 0; index < count; index++) {
          if (
            JSON.stringify(oldValue[index]) !== JSON.stringify(newValue[index])
          ) {
            failures.push(
              `${path}: ${key}[${index}] changed: ${JSON.stringify(oldValue[index] ?? null)} -> ${JSON.stringify(newValue[index] ?? null)}`,
            );
          }
        }
      } else {
        failures.push(
          `${path}: ${key} changed: ${JSON.stringify(oldValue)} -> ${JSON.stringify(newValue)}`,
        );
      }
    }
  }
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
  } else {
    console.log(`PASS structure lock: ${routes.length} routes match baseline`);
  }
}
