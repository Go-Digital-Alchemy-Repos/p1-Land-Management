import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Dashboard and retained Core components must resolve one React renderer in tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["artifacts/p1-dashboard/tests/*.{test,spec}.tsx"],
    server: { deps: { inline: ["lucide-react"] } },
  },
  resolve: {
    alias: {
      "lucide-react": path.resolve(__dirname, "../../artifacts/p1-dashboard/node_modules/lucide-react"),
      recharts: path.resolve(__dirname, "../../artifacts/p1-dashboard/node_modules/recharts"),
      "@workspace/api-client-react/dashboard": path.resolve(__dirname, "../../lib/api-client-react/src/dashboard/index.ts"),
      react: path.resolve(__dirname, "../../artifacts/p1-dashboard/node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../artifacts/p1-dashboard/node_modules/react-dom"),
    },
  },
});
