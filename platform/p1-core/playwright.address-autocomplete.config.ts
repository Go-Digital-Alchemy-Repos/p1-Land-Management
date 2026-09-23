import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/dashboard",
  testMatch: "address-autocomplete.spec.ts",
  reporter: "line",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5219", channel: "chrome" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: "pnpm --dir ../../artifacts/p1-dashboard dev --port 5219",
    url: "http://127.0.0.1:5219/tests/address-autocomplete-browser.html",
    timeout: 30_000,
    reuseExistingServer: false,
  },
});
