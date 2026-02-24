/**
 * E2E: Authentication flows.
 * Uses E2E_TEST_EMAIL and E2E_TEST_PASSWORD from .env.e2e (or .env.local).
 * Create test user first: DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=... node scripts/create-demo-super-admin.js
 */
import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || process.env.DEMO_ADMIN_EMAIL;
const TEST_PASSWORD =
  process.env.E2E_TEST_PASSWORD || process.env.DEMO_ADMIN_PASSWORD;

test.describe("Auth (requires credentials)", () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set",
  );

  test("login with valid credentials redirects to admin", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(TEST_EMAIL!);
    await page.locator("#password").fill(TEST_PASSWORD!);
    await page.getByRole("button", { name: /sincronizar|acceso/i }).click();

    // Login → onboarding/choice → redirect to /admin (user has org)
    await expect(page).toHaveURL(/\/admin/, { timeout: 25000 });
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("invalid@test.local");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: /sincronizar|acceso/i }).click();

    // Supabase: "Invalid login credentials" | generic: "Login failed"
    await expect(
      page.getByText(/invalid|inválid|incorrect|failed|credentials|error/i),
    ).toBeVisible({ timeout: 8000 });
  });
});
