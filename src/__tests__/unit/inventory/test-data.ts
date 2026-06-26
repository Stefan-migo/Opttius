/**
 * Test data factory for import product tests.
 * Provides reusable fixtures for all import-related test files.
 */

import type { ImportProduct } from "@/lib/inventory/import-service";

/**
 * Create a valid ImportProduct fixture with sensible defaults.
 * Override any field via the `overrides` parameter.
 */
export function makeImportProduct(
  overrides: Partial<ImportProduct> = {},
): ImportProduct {
  return {
    name: "Test Product",
    slug: "test-product",
    price: 19900,
    status: "active",
    stock_quantity: 10,
    ...overrides,
  };
}

/**
 * Create an array of ImportProduct fixtures.
 * Each product gets a unique name/slug based on the index.
 */
export function makeImportProducts(
  count: number,
  overrides: Partial<ImportProduct> = {},
): ImportProduct[] {
  return Array.from({ length: count }, (_, i) =>
    makeImportProduct({
      name: `Test Product ${i + 1}`,
      slug: `test-product-${i + 1}`,
      ...overrides,
    }),
  );
}

/**
 * CSV content templates for test scenarios.
 */
export const CSV_TEMPLATES = {
  standard: `name,price,stock,sku
"Producto A",19900,10,SKU-001
"Producto B",29900,5,SKU-002
"Producto C",9900,20,SKU-003`,

  singleRow: `name,price,stock
"Single Product",15000,3`,

  empty: `name,price,stock`,

  withQuotedCommas: `name,description,price
"Lens Cleaner","Cleans lenses, removes smudges, anti-fog",5000`,
};
