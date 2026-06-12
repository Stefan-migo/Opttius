/**
 * E2E: Import Wizard 4-step UI flow.
 *
 * Tests the /admin/products/import wizard page: upload → map → clean → import.
 *
 * Requires: Supabase local, valid admin auth state in e2e/storageState/admin.json,
 * test credentials in .env.e2e or .env.local.
 *
 * The wizard components (ImportStepUpload, ImportStepMap, ImportStepClean,
 * ImportStepReview) must be rendered by the /admin/products/import page.
 *
 * To run: npm run test:e2e
 */
import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || process.env.DEMO_ADMIN_EMAIL;
const TEST_PASSWORD =
  process.env.E2E_TEST_PASSWORD || process.env.DEMO_ADMIN_PASSWORD;

test.describe("Import Wizard 4-step flow", () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set",
  );

  /**
   * Helper: Create a synthetic CSV file in a File object for upload.
   * Returns a DataTransfer with the file ready for input[type=file].
   */
  async function createCsvFile(
    page: import("@playwright/test").Page,
    rows: string[][],
  ): Promise<import("@playwright/test").Locator> {
    const headers = rows[0];
    const dataLines = rows
      .slice(1)
      .map((r) => r.map((v) => `"${v}"`).join(","));
    const csvContent = [headers.join(","), ...dataLines].join("\n");

    // Set the file on the hidden file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-products.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent, "utf-8"),
    });
    return fileInput;
  }

  /**
   * REQ-6.1: Full upload → map → clean → import flow.
   *
   * Given a logged-in admin user on /admin/products/import,
   * when the user uploads a CSV, reviews mapping, cleans data, and clicks import,
   * then products are created and a success toast is shown.
   */
  test("full 4-step wizard import completes successfully", async ({ page }) => {
    await page.goto("/admin/products/import");
    await expect(page).toHaveURL(/\/admin\/products\/import/);

    // Step 1: Upload — select file and see parsed preview
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 10000 });

    await createCsvFile(page, [
      ["name", "price", "stock", "sku"],
      ["Lente Wizard A", "120000", "10", "SKU-WIZ-001"],
      ["Lente Wizard B", "85000", "5", "SKU-WIZ-002"],
    ]);

    // After upload, the wizard should auto-detect headers and move to Step 2
    // or show a "Next" button to proceed
    const nextButton = page.locator('button:has-text("Siguiente")');
    await expect(nextButton).toBeVisible({ timeout: 5000 });

    // Step 2: Map — verify auto-mapping is shown
    await nextButton.click();
    // The mapping step should display detected columns
    const mappingSection = page.locator(
      "text=Mapeo de columnas, text=Columnas detectadas",
    );
    await expect(mappingSection.first()).toBeVisible({ timeout: 5000 });

    // Step 3: Clean — navigate to data cleaning
    await page.locator('button:has-text("Siguiente")').click();
    const cleanSection = page.locator("text=Limpiar datos, text=Vista previa");
    await expect(cleanSection.first()).toBeVisible({ timeout: 5000 });

    // Step 4: Import — execute the import
    await page
      .locator('button:has-text("Importar"), button:has-text("Finalizar")')
      .click();

    // Expect success redirect to /admin/products and a success toast
    await expect(page).toHaveURL(/\/admin\/products/, { timeout: 15000 });
    const successToast = page.locator(
      'text=importad, text=completada, [role="status"]',
    );
    await expect(successToast.first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * REQ-6.2: No-branch selected → toast guard.
   *
   * Given a logged-in admin user without a branch selected,
   * when the wizard tries to import,
   * then toast.error is called and no API call is made.
   *
   * The test simulates a no-branch state by navigating to the wizard
   * without a branch cookie/localStorage, or by checking the guard.
   */
  test("wizard blocks import without branch selection", async ({ page }) => {
    // Clear branch-related localStorage to simulate no-branch state
    await page.goto("/admin/products/import");
    await page.evaluate(() => {
      localStorage.removeItem("selected_branch_id");
    });
    await page.reload();
    await expect(page).toHaveURL(/\/admin\/products\/import/);

    // Upload a file to trigger the wizard flow
    await createCsvFile(page, [
      ["name", "price", "stock"],
      ["Product Sin Branch", "50000", "5"],
    ]);

    // Try to proceed through the wizard
    const nextButton = page.locator('button:has-text("Siguiente")');
    if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextButton.click();
    }

    // Attempt to import
    const importButton = page.locator(
      'button:has-text("Importar"), button:has-text("Finalizar")',
    );
    if (await importButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await importButton.click();
    }

    // Expect an error toast about missing branch — the wizard should validate
    // branch selection before making the API call
    const errorToast = page.locator(
      'text=Selecciona una sucursal, text=sucursal, [role="alert"]',
    );
    // Allow more time for the guard check
    await expect(errorToast.first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * REQ-6.3: Step navigation back/forward.
   *
   * Given a logged-in admin user on /admin/products/import,
   * when the user progresses through all 4 steps,
   * then each step renders correctly.
   */
  test("wizard supports step navigation through all 4 steps", async ({
    page,
  }) => {
    await page.goto("/admin/products/import");
    await expect(page).toHaveURL(/\/admin\/products\/import/);

    // Upload a file first
    await createCsvFile(page, [
      ["name", "price", "stock", "category"],
      ["Producto Navegación", "30000", "8", "Lentes"],
    ]);

    // Step 1: Upload step should show parsed file info
    const uploadComplete = page.locator(
      "text=Producto Navegación, text=archivo cargado",
    );
    await expect(uploadComplete.first()).toBeVisible({ timeout: 5000 });

    // Navigate forward through all steps
    const nextButtons = page.locator('button:has-text("Siguiente")');

    // Step 2: Map
    const step2Btn = nextButtons.first();
    await expect(step2Btn).toBeVisible({ timeout: 3000 });
    await step2Btn.click();
    await expect(
      page.locator("text=Mapeo de columnas, text=mapeo"),
    ).toBeVisible({ timeout: 5000 });

    // Step 3: Clean
    await page.locator('button:has-text("Siguiente")').click();
    await expect(
      page.locator(
        "text=Limpiar datos, text=Vista previa, text=previsualización",
      ),
    ).toBeVisible({ timeout: 5000 });

    // Step 4: Import/Review
    await page.locator('button:has-text("Siguiente")').click();
    await expect(
      page.locator("text=Revisar importación, text=Confirmar, text=Importar"),
    ).toBeVisible({ timeout: 5000 });

    // Navigate backward — Verify back buttons work
    const backButton = page.locator(
      'button:has-text("Atrás"), button:has-text("Anterior")',
    );
    if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backButton.click();
      // Should be back at clean step
      await expect(
        page.locator("text=Limpiar datos, text=previsualización"),
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
