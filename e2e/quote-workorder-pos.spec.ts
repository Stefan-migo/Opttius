/**
 * E2E: Quote → Work Order → POS Lifecycle
 *
 * Hybrid approach: API-seed test data via page.request, then minimal UI verification.
 * 1. Creates a customer via POST /api/admin/customers
 * 2. Creates a product via POST /api/admin/products
 * 3. Creates a quote via POST /api/admin/quotes
 * 4. Converts quote to work order via POST /api/admin/quotes/[id]/convert
 * 5. Advances work order status via PUT /api/admin/work-orders/[id]/status
 * 6. Navigates to /admin/work-orders and verifies the work order in the table
 *
 * Requires: storageState admin.json with valid session, Supabase local running.
 */
import { expect, test } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || process.env.DEMO_ADMIN_EMAIL;
// Seed branch: Casa Matriz (supabase/seed.sql)
const DEMO_BRANCH_ID = "00000000-0000-0000-0000-000000000031";

test.describe("Quote → Work Order → POS Lifecycle", () => {
  test.skip(!TEST_EMAIL, "E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set");

  // FIXED (SDD change fix-e2e-revealed-bugs): POST /api/admin/quotes/[id]/convert
  // now defaults absent lens/frame data (lens_type='single_vision', lens_material='cr39',
  // frame_name='Marco') mirroring process_pos_sale COALESCE, so frame-only quotes
  // convert without NOT NULL / CHECK violations.
  test("API create quote -> convert -> advance status -> UI verify on cash-register", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const frameName = `E2E QuoteWO Frame ${timestamp}`;

    // ── Step 1: API — Create a customer (required by quote) ──────────────
    const customerRes = await page.request.post("/api/admin/customers", {
      headers: {
        // CSRF: un navegador real manda Origin; sin él el middleware rechaza con 403
        Origin: "http://localhost:3000",
      },
      data: {
        first_name: "E2E",
        last_name: `QuoteWO-${timestamp}`,
        email: `e2e-quotewo-${timestamp}@test.com`,
        branch_id: DEMO_BRANCH_ID,
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

    // ── Step 2: API — Create a physical product ─────────────────────────
    const productRes = await page.request.post("/api/admin/products", {
      headers: {
        // CSRF: un navegador real manda Origin; sin él el middleware rechaza con 403
        Origin: "http://localhost:3000",
      },
      data: {
        name: frameName,
        price: 50000,
        product_type: "frame",
        status: "active",
        stock_quantity: 10,
        // Super admin en vista global debe especificar sucursal (Casa Matriz demo)
        branch_id: DEMO_BRANCH_ID,
      },
    });
    expect(
      productRes.ok(),
      `Product creation should succeed (${productRes.status()})`,
    ).toBeTruthy();
    const productBody: Record<string, unknown> = await productRes.json();
    const productId: string | undefined =
      productBody.product?.id || productBody.id;
    expect(productId, "Product should have an id").toBeDefined();

    // ── Step 3: API — Create a quote with customer + product ────────────
    const quoteRes = await page.request.post("/api/admin/quotes", {
      headers: {
        // CSRF: un navegador real manda Origin; sin él el middleware rechaza con 403
        Origin: "http://localhost:3000",
      },
      data: {
        customer_id: customerId,
        frame_product_id: productId,
        frame_name: frameName,
        frame_price: 50000,
        total_amount: 50000,
      },
    });
    expect(
      quoteRes.ok(),
      `Quote creation should succeed (${quoteRes.status()})`,
    ).toBeTruthy();
    const quoteBody: Record<string, unknown> = await quoteRes.json();
    // createApiSuccessResponse wraps data in { success: true, data: {...} }
    const quoteData = (quoteBody.data || quoteBody) as Record<string, unknown>;
    const quoteId: string | undefined = quoteData.id as string | undefined;
    expect(quoteId, "Quote should have an id").toBeDefined();
    if (!quoteId) {
      throw new Error("Quote created but returned no id");
    }

    // ── Step 4: API — Convert quote to work order ──────────────────────
    const convertRes = await page.request.post(
      `/api/admin/quotes/${quoteId}/convert`,
      {
        headers: {
          // CSRF: un navegador real manda Origin; sin él el middleware rechaza con 403
          Origin: "http://localhost:3000",
        },
      },
    );
    expect(
      convertRes.ok(),
      `Convert should succeed (${convertRes.status()})`,
    ).toBeTruthy();
    const convertBody: Record<string, unknown> = await convertRes.json();
    const workOrder = convertBody.workOrder as Record<string, unknown> | undefined;
    const workOrderId: string | undefined = workOrder?.id as string | undefined;
    const workOrderNumber: string | undefined =
      workOrder?.work_order_number as string | undefined;
    expect(workOrderNumber, "Convert should return work_order_number").toBeDefined();
    if (!workOrderId || !workOrderNumber) {
      throw new Error("Convert succeeded but missing work order id/number");
    }

    // ── Step 5: API — Advance work order status ─────────────────────────
    const statusRes = await page.request.put(
      `/api/admin/work-orders/${workOrderId}/status`,
      {
        headers: {
          // CSRF: un navegador real manda Origin; sin él el middleware rechaza con 403
          Origin: "http://localhost:3000",
        },
        data: { status: "ready_for_pickup" },
      },
    );
    expect(
      statusRes.ok(),
      `Status advance should succeed (${statusRes.status()})`,
    ).toBeTruthy();

    // ── Step 6: UI — Navigate to the work-orders page (Trabajos) ─────────
    // Work orders render on /admin/work-orders, not in the cash-register
    // Ventas/Órdenes tab (which lists `orders` table rows only).
    await page.goto("/admin/work-orders");
    // Dev-server rendering can take 30s+ (session splash + on-demand route compile
    // + work orders fetch). Wait for the table first, then the specific work order.
    await expect(page.getByRole("table")).toBeVisible({ timeout: 90000 });
    await expect(
      page.getByRole("cell", { name: workOrderNumber, exact: true }),
    ).toBeVisible({ timeout: 90000 });
  });
});
