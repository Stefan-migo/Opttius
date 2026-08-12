import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.e2e", override: true });

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const baseURLHost = new URL(baseURL).hostname;
const isLocalBaseURL = ["127.0.0.1", "localhost", "::1"].includes(baseURLHost);
const authFile = ".playwright/.auth/admin.json";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

/**
 * Playwright E2E config for Opttius.
 * Public tests do not depend on auth setup. All other E2E tests use the
 * generated admin state created by the setup project.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      // Generate auth only with: npx playwright test --project=setup
      testMatch: /global\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "public",
      testMatch: /(?:auth|onboarding)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin",
      testMatch: /.*\.spec\.ts/,
      testIgnore: /(?:auth|onboarding)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: authFile },
      dependencies: ["setup"],
    },
  ],
  ...(isLocalBaseURL &&
    !skipWebServer && {
      webServer: {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
    }),
});
