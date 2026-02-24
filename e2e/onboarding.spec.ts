/**
 * E2E: Onboarding flow.
 * Tests the /onboarding/choice page and redirects.
 * Requires: User logged in WITHOUT organization (fresh signup).
 *
 * For tests with auth: Create user via scripts/create-demo-super-admin.js
 * and set E2E_TEST_EMAIL, E2E_TEST_PASSWORD in .env.e2e
 */
import { test, expect } from "@playwright/test";

test.describe("Onboarding", () => {
  test("login page loads and has sign in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/opttius|login|iniciar/i);
    await expect(page.getByLabel(/credencial|email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sincronizar|acceso/i }),
    ).toBeVisible();
  });

  test("onboarding choice redirects to login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/onboarding/choice");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("home/landing loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\//);
    // Should show landing or redirect to login
    const hasLogin = await page
      .getByRole("link", { name: /iniciar|login|entrar/i })
      .isVisible()
      .catch(() => false);
    const hasSignUp = await page
      .getByRole("link", { name: /registr|sign up/i })
      .isVisible()
      .catch(() => false);
    expect(hasLogin || hasSignUp || page.url().includes("login")).toBeTruthy();
  });
});
