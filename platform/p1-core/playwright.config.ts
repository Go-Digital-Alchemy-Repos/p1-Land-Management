import { defineConfig } from "@playwright/test";

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900, hasTouch: false },
  { name: "desktop-1280", width: 1280, height: 800, hasTouch: false },
  { name: "compact-1024", width: 1024, height: 768, hasTouch: false },
  { name: "tablet-768", width: 768, height: 1024, hasTouch: true },
  { name: "mobile-430", width: 430, height: 932, hasTouch: true },
  { name: "mobile-390", width: 390, height: 844, hasTouch: true },
  { name: "mobile-375", width: 375, height: 667, hasTouch: true },
] as const;

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/app/**",
  outputDir: "./test-results/playwright",
  reporter: "line",
  workers: 4,
  use: {
    baseURL: "http://127.0.0.1:5199",
    trace: "off",
  },
  projects: viewports.map(({ name, width, height, hasTouch }) => ({
    name,
    use: {
      viewport: { width, height },
      hasTouch,
      isMobile: hasTouch && width < 768,
    },
  })),
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 5199",
    url: "http://127.0.0.1:5199/auth/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
