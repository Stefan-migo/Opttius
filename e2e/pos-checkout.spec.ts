/**
 * E2E: POS Checkout Flow
 *
 * Hybrid approach: API-seed test data via page.request, then minimal UI verification.
 * 1. Creates a physical product via POST /api/admin/products
 * 2. Processes a sale via POST /api/admin/pos/process-sale
 * 3. Navigates to /admin/cash-register and verifies the order in the Ventas/Órdenes tab
 *
 * Requires: storageState admin.json with valid session, Supabase local running.
 */
import { expect, test } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || process.env.DEMO_ADMIN_EMAIL;

test.describe("POS Checkout", () => {
  test.skip(!TEST_EMAIL, "E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set");

  // FIXED (SDD change fix-e2e-revealed-bugs): POST /api/admin/products now derives
  // organization_id from the effective branch (branches.organization_id) instead of
  // the admin's org, so product + product_branch_stock land in the branch's org and
  // the sale stock decrement resolves. process_pos_sale org propagation was fixed
  // previously (migración 20260701).
  test("API create product → process sale → UI verify order on cash-register", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const productName = `E2E Frame ${timestamp}`;
    const customerName = `E2E Cliente ${timestamp}`;

    // ── Step 0: API Seed — Create a customer (Cash-First requiere customer_id real) ──
    const customerRes = await page.request.post("/api/admin/customers", {
      headers: {
        // CSRF: un navegador real manda Origin; sin él el middleware rechaza con 403
        Origin: "http://localhost:3000",
      },
      data: {
        first_name: `E2E Cliente ${timestamp}`,
        last_name: "Test",
        email: `e2e-customer-${timestamp}@test.local`,
        // Super admin en vista global debe especificar sucursal (Casa Matriz demo)
        branch_id: "96823c54-347c-4dc9-9abd-51e2c8863618",
      },
    });
    expect(
      customerRes.ok(),
      `Customer creation should succeed (${customerRes.status()})`,
    ).toBeTruthy();
    const customerBody: Record<string, unknown> = await customerRes.json();
    const customerId: string | undefined =
      customerBody.customer?.id ||
      customerBody.data?.customer?.id ||
      (customerBody.data as Record<string, unknown> | undefined)?.id ||
      (customerBody as { id?: string }).id;
    expect(customerId, "Customer should have an id").toBeDefined();

    // ── Step 1: API Seed — Create a physical product ──────────────────────
    const productRes = await page.request.post("/api/admin/products", {
      headers: {
        // CSRF: un navegador real manda Origin; sin él el middleware rechaza con 403
        Origin: "http://localhost:3000",
      },
      data: {
        name: productName,
        price: 10000,
        product_type: "frame",
        status: "active",
        stock_quantity: 10,
        // Super admin en vista global debe especificar sucursal (Casa Matriz demo)
        branch_id: "96823c54-347c-4dc9-9abd-51e2c8863618",
      },
    });
    expect(productRes.ok(), "Product creation should succeed").toBeTruthy();
    const productBody: Record<string, unknown> = await productRes.json();
    const productId: string | undefined =
      productBody.product?.id || productBody.id;
    expect(productId, "Product should have an id").toBeDefined();

    // ── Step 2: API — Process sale via POS process-sale endpoint ──────────
    const saleRes = await page.request.post("/api/admin/pos/process-sale", {
      headers: {
        // CSRF: un navegador real manda Origin; sin él el middleware rechaza con 403
        Origin: "http://localhost:3000",
        // Super admin en vista global necesita branch explícito (Casa Matriz demo)
        "x-branch-id": "96823c54-347c-4dc9-9abd-51e2c8863618",
      },
      data: {
        customer_id: customerId,
        customer_name: customerName,
        payment_method_type: "cash",
        items: [
          {
            product_id: productId,
            product_name: productName,
            quantity: 1,
            unit_price: 10000,
          },
        ],
        subtotal: 10000,
        tax_amount: 0,
        total_amount: 10000,
        // Contrato real Cash-First: payments array con method + amount (zod pos.ts)
        payments: [{ method: "cash", amount: 10000 }],
        cash_received: 10000,
        change_amount: 0,
      },
    });

    // Store sale result as a plain object for verification
    let saleOrderNumber: string | null = null;
    let saleSucceeded = false;

    if (saleRes.ok()) {
      const saleBody: Record<string, unknown> = await saleRes.json();
      saleOrderNumber = saleBody.data?.order?.order_number ?? null;
      saleSucceeded = true;
      console.log(`[POS E2E] Sale created: order# ${saleOrderNumber}`);
    } else {
      const errorText = await saleRes.text();
      console.log(
        `[POS E2E] Sale API failed (${saleRes.status()}): ${errorText.substring(0, 300)}`,
      );
    }

    // Hard assert — the sale must succeed and return an order number
    // (regression guard for bug 1: product + stock in the branch's org).
    expect(
      saleSucceeded,
      `Sale should succeed (HTTP ${saleRes.status()})`,
    ).toBeTruthy();
    if (!saleOrderNumber) {
      throw new Error("Sale succeeded but returned no order_number");
    }

    // ── Step 3: UI — Navigate to cash-register with the sale branch scoped ──
    // The E2E admin belongs to another org, so its global view is org-scoped and
    // the demo branch (96823c54) is not in its selectable branch list. Scope the
    // orders fetch to the sale branch — exactly what a session of an admin of that
    // branch would send — so the rendering below verifies the order as that admin
    // would see it. The API asserts above are the unfiltered regression guard.
    await page.route("**/api/admin/orders**", async (route) => {
      const response = await route.fetch({
        headers: {
          ...route.request().headers(),
          "x-branch-id": "96823c54-347c-4dc9-9abd-51e2c8863618",
        },
      });
      await route.fulfill({ response });
    });
    await page.goto("/admin/cash-register");
    // Dev-server rendering can take 30s+ (session splash + on-demand route compile
    // + orders fetch). Wait for the tabs first, then assert the order row with a
    // generous timeout; the API asserts above already proved the order exists.
    await expect(
      page.getByRole("tab", { name: /ventas|ordenes/i }),
    ).toBeVisible({ timeout: 90000 });
    await page.getByRole("tab", { name: /ventas|ordenes/i }).click();
    await expect(
      page.getByRole("cell", { name: saleOrderNumber, exact: true }),
    ).toBeVisible({ timeout: 90000 });

    // Verify customer name in the order
    await expect(
      page.getByRole("cell", {
        name: new RegExp(customerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      }),
    ).toBeVisible({ timeout: 15000 });

    // Verify the total (formatted as $10.000 in es-CL locale), scoped to the
    // order's row — other E2E runs leave $10.000 orders in today's list too.
    const orderRow = page.getByRole("row", {
      name: new RegExp(saleOrderNumber),
    });
    await expect(orderRow.getByText(/10\.000/)).toBeVisible({ timeout: 15000 });
  });
});
