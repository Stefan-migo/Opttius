/**
 * E2E: Authentication flows.
 * Uses E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD from .env.e2e (or fallbacks).
 * Create test user first: DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=... node scripts/create-demo-super-admin.js
 *
 * Real login contract (source: src/app/login/page.tsx + src/app/onboarding/choice/page.tsx):
 *   /login → signIn → router.replace("/onboarding/choice")
 *     → check-status: root user → /admin/saas-management/dashboard
 *                     has org    → /admin
 *                     no org     → shows demo/create options
 */
import { expect, test } from "@playwright/test";

const TEST_EMAIL =
  process.env.E2E_ADMIN_EMAIL ||
  process.env.E2E_TEST_EMAIL ||
  process.env.DEMO_ADMIN_EMAIL;
const TEST_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ||
  process.env.E2E_TEST_PASSWORD ||
  process.env.DEMO_ADMIN_PASSWORD;

test.describe("Auth (requires credentials)", () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD not set",
  );

  test("login with valid credentials reaches admin area", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(TEST_EMAIL!);
    await page.locator("#password").fill(TEST_PASSWORD!);
    await page.getByRole("button", { name: /Acceder|Iniciar sesión/i }).click();

    // Contracto real: login NO redirige directo a /admin. Primero sale de /login
    // (login válido), luego /onboarding/choice decide el destino.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    // El E2E admin tiene organización → /admin (root iría a /admin/saas-management/dashboard)
    await expect(page).toHaveURL(/\/admin(?:\/|$)/, { timeout: 25000 });
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("invalid@test.local");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: /Acceder|Iniciar sesión/i }).click();

    // Supabase: "Invalid login credentials" | generic: "Login failed"
    await expect(
      page.getByText(/invalid|inválid|incorrect|failed|credentials|error/i),
    ).toBeVisible({ timeout: 8000 });
  });
});
