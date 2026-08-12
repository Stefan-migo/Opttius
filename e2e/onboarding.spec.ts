/**
 * E2E: Onboarding flow.
 * Tests the /onboarding/choice page and redirects.
 * Requires: User logged in WITHOUT organization (fresh signup).
 *
 * For tests with auth: Create user via scripts/create-demo-super-admin.js
 * and set E2E_TEST_EMAIL, E2E_TEST_PASSWORD in .env.e2e
 */
import { expect, test } from "@playwright/test";

test.describe("Onboarding", () => {
  test("login page loads and has sign in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/opttius|login|iniciar/i);
    await expect(page.getByLabel(/credencial|email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Acceder|Iniciar sesión/i }),
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
    // Landing pública (sin sesión): muestra CTA de demo o redirige a login.
    // "Solicitar Demo" aparece en el header y en el hero → usar .first() para evitar strict mode.
    const hasDemo = await page
      .getByRole("button", { name: /solicitar demo/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasExplore = await page
      .getByRole("button", { name: /explorar la plataforma/i })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasDemo || hasExplore || page.url().includes("login")).toBeTruthy();
  });
});
