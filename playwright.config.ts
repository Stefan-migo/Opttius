import { defineConfig, devices } from "@playwright/test";

// Load .env.local for E2E_TEST_* and DEMO_ADMIN_* (auth tests)
require("dotenv").config({ path: ".env.local" });

/**
 * Playwright E2E config for Opttius.
 * Requires: Supabase local, Next.js dev server, and test credentials.
 * See docs/E2E_TESTING.md for setup.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global.setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Skip webServer if PLAYWRIGHT_SKIP_WEBSERVER=1 (server already running)
  ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "1" && {
    webServer: {
      command: "npm run dev",
      url: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
});
