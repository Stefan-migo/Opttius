import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test as setup } from "@playwright/test";

const authFile = path.resolve(".playwright/.auth/admin.json");

function getAdminCredentials() {
  const credentialPairs = [
    ["E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"],
    ["E2E_TEST_EMAIL", "E2E_TEST_PASSWORD"],
    ["DEMO_ADMIN_EMAIL", "DEMO_ADMIN_PASSWORD"],
    ["ADMIN_EMAIL", "ADMIN_PASSWORD"],
  ] as const;

  for (const [emailKey, passwordKey] of credentialPairs) {
    const email = process.env[emailKey];
    const password = process.env[passwordKey];

    if (email && password) {
      return { email, password };
    }
  }

  throw new Error(
    "Missing E2E admin credentials. Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.e2e. Accepted fallbacks: E2E_TEST_*, DEMO_ADMIN_*, or ADMIN_* pairs.",
  );
}

setup("authenticate admin", async ({ page }) => {
  // Cold first load (session splash + on-demand /login compile) can exceed the
  // 30s default testTimeout; the 90s waitForURL below must be able to fire.
  setup.setTimeout(180_000);
  const { email, password } = getAdminCredentials();

  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /Acceder|Iniciar sesión/i }).click();

  try {
    await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 90_000 });
    await expect(page).toHaveURL(/\/admin(?:\/|$)/);
  } catch {
    throw new Error(
      `E2E admin login did not reach /admin. Check the configured account and admin access. Current URL: ${page.url()}`,
    );
  }

  await mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
