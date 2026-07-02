/**
 * Validates the FAQPage (and other) JSON-LD emitted by every page.
 *
 * Renders each page module server-side with the <SEO> component stubbed to
 * capture its `jsonLd` prop, then checks that:
 *   - every page that calls faqSchema(...) emits exactly ONE FAQPage block
 *   - no page emits more than one FAQPage block
 *   - each FAQPage serializes to valid JSON and matches Google's expected
 *     shape: @type FAQPage, non-empty mainEntity of Question/Answer pairs
 *   - no question is empty, no answer is empty, no duplicate questions
 *
 * Run with: pnpm --filter @workspace/p1-website run check:faq
 */
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pagesDir = path.join(root, "src", "pages");

const SEO_MODULE = path.join(root, "src", "components", "seo.tsx");
const SEO_STUB_ID = "\0virtual:seo-capture";

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const seoStubPlugin = {
  name: "seo-capture-stub",
  enforce: "pre",
  resolveId(source, importer) {
    if (
      source === "@/components/seo" ||
      (importer && path.resolve(path.dirname(importer), source) === SEO_MODULE.replace(/\.tsx$/, ""))
    ) {
      return SEO_STUB_ID;
    }
    return null;
  },
  load(id) {
    if (id === SEO_STUB_ID) {
      return `
        export function SEO(props) {
          if (!globalThis.__seoCaptures) globalThis.__seoCaptures = [];
          globalThis.__seoCaptures.push(props);
          return null;
        }
      `;
    }
    return null;
  },
};

const errors = [];
const warnings = [];

function err(page, msg) {
  errors.push(`  ${page}: ${msg}`);
}

function validateFaqBlock(page, block) {
  if (block["@context"] !== "https://schema.org") {
    err(page, `FAQPage @context is "${block["@context"]}", expected "https://schema.org"`);
  }
  const main = block.mainEntity;
  if (!Array.isArray(main) || main.length === 0) {
    err(page, "FAQPage mainEntity is missing, not an array, or empty");
    return;
  }
  const seen = new Set();
  main.forEach((q, i) => {
    if (q["@type"] !== "Question") {
      err(page, `mainEntity[${i}] @type is "${q["@type"]}", expected "Question"`);
    }
    const name = typeof q.name === "string" ? q.name.trim() : "";
    if (!name) err(page, `mainEntity[${i}] has an empty or missing question name`);
    const key = name.toLowerCase();
    if (seen.has(key)) err(page, `duplicate question: "${name}"`);
    seen.add(key);
    const ans = q.acceptedAnswer;
    if (!ans || ans["@type"] !== "Answer") {
      err(page, `mainEntity[${i}] acceptedAnswer missing or @type is not "Answer"`);
    } else {
      const text = typeof ans.text === "string" ? ans.text.trim() : "";
      if (!text) err(page, `mainEntity[${i}] ("${name}") has an empty answer`);
    }
    if (Array.isArray(q.suggestedAnswer) || q.suggestedAnswer) {
      warnings.push(`  ${page}: mainEntity[${i}] uses suggestedAnswer (Google prefers acceptedAnswer only)`);
    }
  });
}

async function main() {
  const server = await createServer({
    root,
    configFile: false,
    logLevel: "error",
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    esbuild: { jsx: "automatic" },
    plugins: [seoStubPlugin],
    resolve: {
      alias: {
        "@": path.join(root, "src"),
        "@assets": path.resolve(root, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
  });

  const pageFiles = walk(pagesDir);
  let checked = 0;
  let faqPages = 0;

  for (const file of pageFiles) {
    const rel = path.relative(root, file);
    const source = fs.readFileSync(file, "utf8");
    const expectsFaq = /\bfaqSchema\s*\(/.test(source);

    globalThis.__seoCaptures = [];
    let mod;
    try {
      mod = await server.ssrLoadModule("/" + path.relative(root, file).split(path.sep).join("/"));
    } catch (e) {
      err(rel, `failed to load module: ${e.message}`);
      continue;
    }
    const Page = mod.default;
    if (typeof Page !== "function") {
      err(rel, "no default-exported page component");
      continue;
    }
    try {
      renderToString(
        React.createElement(Router, { ssrPath: "/" }, React.createElement(Page)),
      );
    } catch (e) {
      err(rel, `failed to render: ${e.message}`);
      continue;
    }

    checked++;
    const captures = globalThis.__seoCaptures;
    if (captures.length === 0) {
      err(rel, "page rendered without an <SEO> component");
      continue;
    }
    if (captures.length > 1) {
      err(rel, `page rendered ${captures.length} <SEO> components (expected 1)`);
    }

    const jsonLdRaw = captures.flatMap((c) =>
      c.jsonLd ? (Array.isArray(c.jsonLd) ? c.jsonLd : [c.jsonLd]) : [],
    );

    // Everything must survive a JSON round-trip (what the SEO component emits).
    let jsonLd;
    try {
      jsonLd = JSON.parse(JSON.stringify(jsonLdRaw));
    } catch (e) {
      err(rel, `jsonLd is not JSON-serializable: ${e.message}`);
      continue;
    }

    const faqBlocks = jsonLd.filter((b) => b && b["@type"] === "FAQPage");
    if (faqBlocks.length > 1) {
      err(rel, `emits ${faqBlocks.length} FAQPage blocks (Google requires at most 1 per page)`);
    }
    if (expectsFaq && faqBlocks.length === 0) {
      err(rel, "calls faqSchema(...) but no FAQPage block was emitted");
    }
    if (!expectsFaq && faqBlocks.length > 0) {
      warnings.push(`  ${rel}: emits a FAQPage block but has no faqSchema(...) call in source`);
    }
    if (faqBlocks.length > 0) faqPages++;
    for (const block of faqBlocks.slice(0, 1)) validateFaqBlock(rel, block);
  }

  await server.close();

  console.log(`\nChecked ${checked}/${pageFiles.length} pages; ${faqPages} emit FAQPage JSON-LD.`);
  if (warnings.length) {
    console.log(`\nWarnings:\n${warnings.join("\n")}`);
  }
  if (errors.length) {
    console.error(`\nFAQ schema validation FAILED:\n${errors.join("\n")}`);
    process.exit(1);
  }
  console.log("\nAll FAQ JSON-LD blocks are valid. ✔");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
