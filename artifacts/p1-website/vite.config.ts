import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync } from "node:fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { cmsPlugin } from "./scripts/cms-plugin.mjs";

const rawPort = process.env.PORT ?? "4173";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";
const allowedHosts = (process.env.DEV_ALLOWED_HOSTS ?? "localhost,127.0.0.1,::1")
  .split(",").map((host) => host.trim()).filter(Boolean);

// Preserve original artwork; application imports resolve to generated delivery assets.
const assetRoot = path.resolve(import.meta.dirname, "src/assets");
const imageManifest = JSON.parse(readFileSync(path.join(assetRoot, "image-manifest.json"), "utf8")) as Record<string, { default: string }>;
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
    const entry = imageManifest[path.relative(assetRoot, absolute).split(path.sep).join("/")];
    return entry ? path.join(assetRoot, entry.default) : null;
  },
};

export default defineConfig({
  ssr: { noExternal: true },
  base: basePath,
  plugins: [
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
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
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
    host: "0.0.0.0",
    allowedHosts,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts,
  },
});
