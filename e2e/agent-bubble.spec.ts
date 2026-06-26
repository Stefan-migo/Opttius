/**
 * E2E: Agent Bubble lifecycle.
 *
 * Tests:
 * - collapsed → click → panel visible (repose state)
 * - repose → type message → conversation mode
 * - close → collapsed
 * - dock toggle → panel fixes
 * - notification → badge visible
 *
 * Requires: authenticated admin session (uses global auth setup).
 * The bubble renders on all /admin/* pages.
 *
 * @module e2e/agent-bubble
 */

import { expect, test } from "@playwright/test";

test.describe("Agent Bubble (requires auth)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard — bubble should be present
    await page.goto("/admin");
    await page.waitForURL(/\/admin/, { timeout: 15000 });
  });

  test("collapsed bubble is visible on admin page", async ({ page }) => {
    // The floating button should be visible (collapsed state)
    await expect(
      page.getByRole("button", { name: /abrir agente/i }),
    ).toBeVisible();
  });

  test("click collapsed bubble → repose state with greeting", async ({
    page,
  }) => {
    // Click the collapsed button
    await page.getByRole("button", { name: /abrir agente/i }).click();

    // Panel should be visible with greeting
    await expect(page.getByText(/agente opttius/i)).toBeVisible({
      timeout: 5000,
    });

    // Suggestions should be visible in repose state
    await expect(page.getByText(/resumen del día/i)).toBeVisible({
      timeout: 3000,
    });
  });

  test("repose → type message → conversation mode", async ({ page }) => {
    // Open bubble
    await page.getByRole("button", { name: /abrir agente/i }).click();
    await expect(page.getByText(/resumen del día/i)).toBeVisible({
      timeout: 3000,
    });

    // Type a message
    const input = page.getByPlaceholder(/haz una pregunta/i);
    await input.fill("¿Cuál es el resumen del día?");

    // Send button should be enabled
    await expect(page.getByRole("button", { name: /enviar/i })).toBeEnabled();

    // Send the message
    await page.getByRole("button", { name: /enviar/i }).click();

    // Should transition to conversation — input placeholder changes
    await expect(page.getByPlaceholder(/escribe un mensaje/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("close → collapsed state", async ({ page }) => {
    // Open bubble first
    await page.getByRole("button", { name: /abrir agente/i }).click();
    await expect(page.getByText(/resumen del día/i)).toBeVisible({
      timeout: 3000,
    });

    // Close button
    await page.getByRole("button", { name: /cerrar agente/i }).click();

    // Should be collapsed again
    await expect(
      page.getByRole("button", { name: /abrir agente/i }),
    ).toBeVisible();
  });

  test("dock toggle → panel fixes", async ({ page }) => {
    // Open bubble
    await page.getByRole("button", { name: /abrir agente/i }).click();

    // Click dock toggle
    await page.getByRole("button", { name: /fijar panel/i }).click();

    // After dock toggle, the state machine goes to docked or conversation
    // The docked panel should have specific styling (right: 0, full height)
    const dockedPanel = page.locator("div.fixed.right-0.top-0.z-40");
    await expect(dockedPanel).toBeVisible({ timeout: 3000 });
  });

  test("preferences panel opens and toggles are visible", async ({ page }) => {
    // Open bubble
    await page.getByRole("button", { name: /abrir agente/i }).click();

    // Click settings/preferences button (gear icon in header)
    await page
      .getByRole("button", { name: /preferencias del agente/i })
      .click();

    // Preferences panel should be visible
    await expect(page.getByText(/preferencias del agente/i)).toBeVisible({
      timeout: 3000,
    });
    await expect(page.getByText(/modo automático/i)).toBeVisible();
    await expect(page.getByText(/posición de la burbuja/i)).toBeVisible();
    await expect(page.getByText(/tono del agente/i)).toBeVisible();
  });
});
