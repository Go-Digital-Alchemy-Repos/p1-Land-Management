import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Legacy CMS behavior tests exercise editing after an explicit opt-in.
    // The new pause tests override this fixture to verify the default-off path.
    env: { P1_CMS_EDITING: "enabled" },
    globals: true,
    environment: "node",
    include: ["server/**/*.test.ts", "shared/**/*.test.ts", "client/**/*.test.ts", "client/**/*.test.tsx"],
    exclude: ["node_modules", "dist", "build", ".cache"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
});
