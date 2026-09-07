import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/pilot",
  testMatch: "*.spec.ts",
  outputDir: "./test-results/pilot",
  reporter: "line",
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  use: {
    baseURL: "https://dashboard.site.localhost:5443",
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node --import tsx e2e/pilot/launch.ts",
    url: "https://127.0.0.1:5443/pilot-ready",
    ignoreHTTPSErrors: true,
    timeout: 180_000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 25000 },
  },
});
