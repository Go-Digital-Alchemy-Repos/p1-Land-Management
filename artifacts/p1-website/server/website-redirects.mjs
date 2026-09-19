import { createHash } from "node:crypto";
import path from "node:path";
import { createPublicSettingsStore } from "./public-settings.mjs";
// Mirror shared/public-redirects.ts; production executes this module without a TS loader.
const MAX_REDIRECT_CHAIN_LENGTH = 10;
const reserved = [
  "/admin",
  "/api",
  "/uploads",
  "/r2",
  "/assets",
  "/cms-preview",
  "/healthz",
  "/robots.txt",
  "/sitemap.xml",
  "/setup",
  "/favicon.ico",
  "/favicon.svg",
  "/p1-symbol.svg",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/testimonials",
  "/commercial-snow-ice-management",
  "/services/commercial-property-management",
  "/service-areas/charlotte-nc",
];
const valid = (value) =>
  typeof value === "string" &&
  value.length <= 2048 &&
  /^\/[A-Za-z0-9/_.~-]*$/.test(value) &&
  !value.includes("//") &&
  !value.split("/").some((p) => p === "." || p === "..") &&
  (value === "/" || !value.endsWith("/")) &&
  !value.endsWith(".html") &&
  !value.endsWith("/index") &&
  !reserved.some((p) => value === p || value.startsWith(p + "/"));
const hash = (rules) =>
  createHash("sha256").update(JSON.stringify(rules)).digest("hex");
export function parseWebsiteRedirects(data) {
  if (
    !data ||
    Object.keys(data).sort().join(",") !==
      "redirects,schemaVersion,stackId,version" ||
    data.schemaVersion !== 1 ||
    data.stackId !== "p1-land-management" ||
    !Array.isArray(data.redirects) ||
    data.redirects.length > 1000
  )
    throw Error("Invalid redirects");
  const rules = new Map();
  for (const r of data.redirects) {
    if (
      !r ||
      Object.keys(r).sort().join(",") !== "fromPath,statusCode,toPath" ||
      !valid(r.fromPath) ||
      !valid(r.toPath) ||
      ![301, 302].includes(r.statusCode) ||
      rules.has(r.fromPath)
    )
      throw Error("Invalid redirect rule");
    rules.set(r.fromPath, r);
  }
  for (const start of rules.keys()) {
    const seen = new Set();
    let next = start;
    while (rules.has(next)) {
      if (seen.has(next)) throw Error("Redirect cycle");
      seen.add(next);
      if (seen.size > MAX_REDIRECT_CHAIN_LENGTH)
        throw Error("Redirect chain too long");
      next = rules.get(next).toPath;
    }
  }
  if (data.version !== hash(data.redirects))
    throw Error("Invalid redirect version");
  return data;
}
export function createWebsiteRedirectStore({ cacheDir, ...options }) {
  return createPublicSettingsStore({
    ...options,
    path: "/api/p1/website-redirects",
    parse: parseWebsiteRedirects,
    maxBytes: 4500000,
    preserveLastValid: true,
    cacheFile: cacheDir
      ? path.join(cacheDir, "website-redirects.json")
      : undefined,
    fallback: () => ({
      schemaVersion: 1,
      stackId: "p1-land-management",
      version: hash([]),
      redirects: [],
    }),
  });
}
export async function resolveWebsiteRedirect(store, pathname, search, method) {
  if (!["GET", "HEAD"].includes(method) || !valid(pathname)) return null;
  const row = (await store.snapshot()).redirects.find(
    (r) => r.fromPath === pathname,
  );
  return row ? { status: row.statusCode, location: row.toPath + search } : null;
}
