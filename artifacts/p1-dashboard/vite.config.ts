import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // Shared Core source is outside this pnpm package; resolve shared runtime dependencies here.
  resolve: { dedupe: ["react", "react-dom", "recharts", "zod", "lucide-react", "react-image-crop", "browser-image-compression", "react-resizable-panels", "sanitize-html", "clsx", "tailwind-merge"] },
  server: {
    port: 4181,
    host: "127.0.0.1",
    proxy: { "/api": { target: "http://localhost:4180", changeOrigin: true } },
  },
  build: { outDir: "dist" },
});
