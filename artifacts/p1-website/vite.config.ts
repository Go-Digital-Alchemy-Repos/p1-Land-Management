import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync } from "node:fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { cmsPlugin } from "./scripts/cms-plugin.mjs";
import { projectResponsiveImageManifest } from "./scripts/public-image-manifest.mjs";
import { projectLocationPage } from "./scripts/public-location-page-manifest.mjs";

const rawPort = process.env.PORT ?? "4173";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";
// Remote previews are opt-in. When exposing one, pair DEV_BIND_HOST=0.0.0.0
// with a narrow DEV_ALLOWED_HOSTS list for its controlled hostname.
const devHost = process.env.DEV_BIND_HOST ?? "127.0.0.1";
const allowedHosts = (
  process.env.DEV_ALLOWED_HOSTS ?? "localhost,127.0.0.1,::1"
)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

// Preserve original artwork; application imports resolve to generated delivery assets.
const assetRoot = path.resolve(import.meta.dirname, "src/assets");
const imageManifest = JSON.parse(
  readFileSync(path.join(assetRoot, "image-manifest.json"), "utf8"),
) as Record<string, { default: string }>;
const locationPages = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "src/lib/location-pages.json"), "utf8"),
) as Array<{ path: string }>;
const responsiveImageManifest = projectResponsiveImageManifest(imageManifest);
const responsiveImageManifestId = "\0p1-responsive-image-manifest";
// The browser never reads source hashes, optimizer quality, or variant byte
// counts. Substitute a projection only for responsive-images.ts; build tools
// continue reading the complete on-disk manifest above.
const responsiveImageManifestPlugin = {
  name: "p1-responsive-image-manifest",
  enforce: "pre" as const,
  resolveId(source: string) {
    if (source === "virtual:p1-responsive-image-manifest")
      return responsiveImageManifestId;
    return null;
  },
  load(id: string) {
    if (id === responsiveImageManifestId)
      return `export default ${JSON.stringify(responsiveImageManifest)};`;
    return null;
  },
};
const locationManifestImport = "@/lib/location-pages.json";
const locationPageManifestPrefix = "\0p1-location-page:";
const locationPageManifestPlugin = {
  name: "p1-location-page-manifest",
  enforce: "pre" as const,
  resolveId(source: string, importer: string | undefined) {
    if (
      (source !== locationManifestImport &&
        !source.endsWith("/src/lib/location-pages.json")) ||
      !importer
    )
      return null;
    const match = /\/src\/pages\/service-areas\/([^/]+)\.tsx(?:\?.*)?$/.exec(importer);
    if (!match) return null;
    const route = `/service-areas/${match[1]}`;
    return locationPages.some((page) => page.path === route)
      ? `${locationPageManifestPrefix}${route}`
      : null;
  },
  load(id: string) {
    if (!id.startsWith(locationPageManifestPrefix)) return null;
    return `export default ${JSON.stringify(projectLocationPage(locationPages, id.slice(locationPageManifestPrefix.length)))};`;
  },
};
const optimizedImages = {
  name: "p1-optimized-images",
  enforce: "pre" as const,
  resolveId(source: string, importer: string | undefined) {
    if (!/\.(png|jpe?g)$/.test(source)) return null;
    const absolute = source.startsWith("@/assets/")
      ? path.join(assetRoot, source.slice("@/assets/".length))
      : source.startsWith(".") && importer
        ? path.resolve(path.dirname(importer.split("?")[0]), source)
        : source;
    const entry =
      imageManifest[
        path.relative(assetRoot, absolute).split(path.sep).join("/")
      ];
    return entry ? path.join(assetRoot, entry.default) : null;
  },
};

export default defineConfig({
  ssr: { noExternal: true },
  base: basePath,
  plugins: [
    responsiveImageManifestPlugin,
    locationPageManifestPlugin,
    optimizedImages,
    react(),
    cmsPlugin(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom", "lucide-react", "clsx", "tailwind-merge"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    manifest: true,
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: devHost,
    allowedHosts,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: devHost,
    allowedHosts,
  },
});
