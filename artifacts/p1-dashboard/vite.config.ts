import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4181,
    host: "127.0.0.1",
    proxy: { "/api": { target: "http://localhost:4180", changeOrigin: true } },
  },
  build: { outDir: "dist" },
});
