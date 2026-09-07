import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/app",
  outputDir: "./test-results/app",
  reporter: "line",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:5201",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "app-desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "app-mobile",
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
  ],
  webServer: {
    command: "node --import tsx server/scripts/start-browser-test-app.ts",
    url: "http://127.0.0.1:5201/api/health/ready",
    timeout: 120_000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
  },
});
