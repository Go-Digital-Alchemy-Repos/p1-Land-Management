import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isReplit = process.env.REPL_ID !== undefined;

function preambleFixPlugin(): Plugin {
  return {
    name: "preamble-fix",
    enforce: "post",
    apply: "serve",
    transform(code, id) {
      if (id.includes("node_modules") || !code.includes("can't detect preamble")) return;
      return code.replace(
        /if\s*\(!window\.\$RefreshReg\$\)\s*\{[^}]*can't detect preamble[^}]*\}/s,
        `if (!window.$RefreshReg$) { window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (t) => t; }`,
      );
    },
  };
}

export default defineConfig({
  base: "/admin/",
  plugins: [
    react(),
    preambleFixPlugin(),
    ...(isReplit && process.env.NODE_ENV !== "production"
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default()),
          await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("/maplibre-gl/") || id.includes("/react-map-gl/") || id.includes("/@vis.gl/react-maplibre/")) {
            return "maps";
          }

          if (id.includes("/@tiptap/")) {
            return "tiptap";
          }

          if (
            id.includes("/prosemirror-") ||
            id.includes("/orderedmap/") ||
            id.includes("/rope-sequence/")
          ) {
            return "prosemirror";
          }

          if (id.includes("/recharts/")) {
            return "charts";
          }

          if (id.includes("/embla-carousel")) {
            return "carousel";
          }

          if (id.includes("/@stripe/") || id.includes("/stripe-js/")) {
            return "stripe";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
