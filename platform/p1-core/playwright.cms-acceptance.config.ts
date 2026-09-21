import { defineConfig } from "@playwright/test";

/**
 * Runs only the CMS acceptance flow against the guarded local PostgreSQL fixture.
 * It deliberately enables the launcher’s synthetic federation provider so the
 * browser exercises the real Dashboard-grant consumer instead of a test auth bypass.
 */
export default defineConfig({
  testDir: "./e2e/app",
  testMatch: "client-site-content-lifecycle.spec.ts",
  outputDir: "./test-results/cms-acceptance",
  reporter: "line",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:5201",
    // Use the preinstalled browser for this local acceptance fixture. The repository
    // does not vendor a Playwright browser binary, and this avoids an unnecessary
    // multi-hundred-megabyte download on developer machines.
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [{ name: "cms-acceptance-desktop", use: { viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command:
      "BROWSER_TEST_FEDERATION=true node --import tsx server/scripts/start-browser-test-app.ts",
    url: "http://127.0.0.1:5201/api/health/ready",
    timeout: 120_000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 },
  },
});
