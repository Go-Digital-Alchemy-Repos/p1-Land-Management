import { defineConfig } from "vitest/config";
import path from "node:path";
// Exercise the consolidated UI with its actual React runtime, rather than Core's
// retained React 18 renderer. Production dependency boundaries are unchanged.
export default defineConfig({
  test: { environment: "jsdom", include: ["tests/dashboard/*.test.tsx"] },
  resolve: {
    alias: {
      "@workspace/api-client-react/dashboard": path.resolve(
        __dirname,
        "../../lib/api-client-react/src/dashboard/index.ts",
      ),
      react: path.resolve(__dirname, "../../artifacts/p1-dashboard/node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../artifacts/p1-dashboard/node_modules/react-dom"),
    },
  },
});
