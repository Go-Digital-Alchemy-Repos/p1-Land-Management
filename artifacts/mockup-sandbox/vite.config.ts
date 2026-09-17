import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const rawPort = process.env.PORT ?? "4174";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";
// Keep an interactive design sandbox local unless a controlled preview host is
// explicitly configured alongside a narrow hostname allowlist.
const devHost = process.env.DEV_BIND_HOST ?? "127.0.0.1";
const allowedHosts = (
  process.env.DEV_ALLOWED_HOSTS ?? "localhost,127.0.0.1,::1"
)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  base: basePath,
  plugins: [
    mockupPreviewPlugin(),
    react(),
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
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
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
