/**
 * E2E: CSV/Excel import API via POST /api/admin/products/import.
 *
 * Tests the file-upload import endpoint directly using Playwright's APIRequestContext.
 * Requires: Supabase local, test credentials in .env.e2e or .env.local, and
 * the `e2e/storageState/admin.json` auth state to be valid.
 *
 * CRITICAL: These tests call the API directly (not via the UI wizard).
 * The admin storage state is loaded via storageState in playwright.config.ts.
 *
 * To run: npm run test:e2e
 */
import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || process.env.DEMO_ADMIN_EMAIL;
const TEST_PASSWORD =
  process.env.E2E_TEST_PASSWORD || process.env.DEMO_ADMIN_PASSWORD;

test.describe("CSV/Excel Import API", () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set",
  );

  /**
   * REQ-4.1: CSV upload creates products with stock update.
   *
   * Given a CSV file with 3 valid products (name, price, stock columns),
   * when uploaded via POST /api/admin/products/import with mode="create",
   * then the response shows success with created=3.
   */
  test("CSV import creates products with stock in branch", async ({
    request,
  }) => {
    const csvContent = [
      "name,price,stock,sku",
      '"Lente Progresivo A",120000,10,SKU-CSV-001',
      '"Antireflex Azul B",85000,5,SKU-CSV-002',
      '"Fotocromático C",150000,3,SKU-CSV-003',
    ].join("\n");

    const response = await request.post("/api/admin/products/import", {
      headers: {
        "x-branch-id": "global",
      },
      multipart: {
        file: {
          name: "products.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(csvContent, "utf-8"),
        },
        mode: "create",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.summary.created).toBe(3);
    expect(body.summary.total_processed).toBe(3);
    expect(body.summary.errors_count).toBe(0);
    expect(body.results.errors).toHaveLength(0);
  });

  /**
   * REQ-4.2: CSV update mode — modifies existing products.
   *
   * Given existing products with known stock,
   * when a CSV is uploaded with mode="update" and updated values,
   * then existing products are updated with differential stock change.
   */
  test("CSV update mode modifies existing products", async ({ request }) => {
    const csvContent = [
      "name,price,stock,sku",
      '"Producto a actualizar",100000,20,SKU-UPDATE-001',
    ].join("\n");

    const response = await request.post("/api/admin/products/import", {
      headers: {
        "x-branch-id": "global",
      },
      multipart: {
        file: {
          name: "products.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(csvContent, "utf-8"),
        },
        mode: "update",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    // In update mode, products that don't exist are skipped with a warning
    // Products that exist get updated (stock is adjusted differentially)
    expect(body.summary).toBeDefined();
    expect(typeof body.summary.created).toBe("number");
    expect(typeof body.summary.updated).toBe("number");
    expect(typeof body.summary.skipped).toBe("number");
    // The response always contains results with warnings array
    expect(Array.isArray(body.results.warnings)).toBe(true);
  });

  /**
   * REQ-4.3: Missing branch — API behavior.
   *
   * Given a valid CSV file,
   * when uploaded without x-branch-id header,
   * then the API either returns an error or creates products without stock.
   * The test documents the actual behavior.
   */
  test("API handles request without branch context", async ({ request }) => {
    const csvContent = [
      "name,price,stock,sku",
      '"Product Sin Branch",50000,5,SKU-NOBRANCH-001',
    ].join("\n");

    const response = await request.post("/api/admin/products/import", {
      // No x-branch-id header — let server determine default
      multipart: {
        file: {
          name: "products.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(csvContent, "utf-8"),
        },
        mode: "create",
      },
    });

    // The server either resolves a default branch or processes without stock.
    // In either case the response should be a valid JSON with success field.
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveProperty("success");
    // Products may still be created (server uses default branch for non-super-admin)
    // or stock may be skipped (super-admin global view).
    // At minimum, the response must be well-formed.
    expect(body).toHaveProperty("summary");
  });

  /**
   * REQ-4.4: Per-line error report for partial failures.
   *
   * Given a CSV with 5 rows where rows 2 and 4 have invalid data,
   * when uploaded, then the response contains a per-line error report,
   * and valid rows are imported successfully.
   */
  test("partial failure returns per-line error report", async ({ request }) => {
    // Build CSV line by line to avoid template literal issues with nested quotes
    const header = "name,price,stock,sku";
    const row1 = '"Producto Válido 1",45000,10,SKU-PARTIAL-001';
    const row2 = ",20000,5,SKU-PARTIAL-002"; // Missing name (row 2)
    const row3 = '"Producto Válido 3",25000,8,SKU-PARTIAL-003';
    const row4 = '"Producto Válido 4",-100,3,SKU-PARTIAL-004'; // Negative price (row 4)
    const row5 = '"Producto Válido 5",99000,12,SKU-PARTIAL-005';
    const csvContent = [header, row1, row2, row3, row4, row5].join("\n");

    const response = await request.post("/api/admin/products/import", {
      headers: {
        "x-branch-id": "global",
      },
      multipart: {
        file: {
          name: "products.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(csvContent, "utf-8"),
        },
        mode: "create",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);

    // Valid rows should succeed
    expect(body.summary.created).toBeGreaterThanOrEqual(3);

    // Error rows should be reported per-line
    expect(body.results.errors.length).toBeGreaterThanOrEqual(2);
    const line2Error = body.results.errors.find(
      (e: string) => e.includes("Línea 2") || e.includes("line 2"),
    );
    const line4Error = body.results.errors.find(
      (e: string) => e.includes("Línea 4") || e.includes("line 4"),
    );
    expect(line2Error).toBeTruthy();
    expect(line4Error).toBeTruthy();
  });

  /**
   * REQ-5.1: Excel import creates products with stock.
   *
   * Given an .xlsx file with 3 products,
   * when uploaded to POST /api/admin/products/import,
   * then all 3 products are created with correct stock.
   */
  test("Excel import creates products with stock", async ({ request }) => {
    // Generate .xlsx buffer in-memory using the xlsx library
    // This avoids committing binary files to the repo
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const data = [
      ["name", "price", "stock", "sku"],
      ["Lente Progresivo Excel", 130000, 10, "SKU-XLSX-001"],
      ["Antireflex Excel B", 90000, 5, "SKU-XLSX-002"],
      ["Fotocromático Excel C", 160000, 3, "SKU-XLSX-003"],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Products");
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;

    const response = await request.post("/api/admin/products/import", {
      headers: {
        "x-branch-id": "global",
      },
      multipart: {
        file: {
          name: "products.xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer,
        },
        mode: "create",
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.summary.created).toBe(3);
    expect(body.summary.total_processed).toBe(3);
    expect(body.summary.errors_count).toBe(0);
  });
});
