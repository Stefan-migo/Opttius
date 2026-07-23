/**
 * Tests for Integration Test Helpers
 *
 * Validates the helper functions in test-setup.ts that are used
 * to create test data for integration and E2E tests.
 *
 * All tests are guarded by SUPABASE_SERVICE_ROLE_KEY env var.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  cleanupTestData,
  createTestBranch,
  createTestOrder,
  createTestOrderPayment,
  createTestOrganization,
  createTestPosSession,
  createTestProduct,
  createTestProductBranchStock,
  createTestUser,
  type TestBranch,
  type TestOrganization,
  type TestUser,
} from "./test-setup";

// Sync check at module level — describe.skipIf evaluates eagerly
const hasSupabaseInfra = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

interface PosSessionResult {
  id: string;
  branch_id: string;
  status: string;
  opening_time: string;
}

interface ProductBranchStockResult {
  id: string;
  product_id: string;
  branch_id: string;
  quantity: number;
}

interface OrderPaymentResult {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  pos_session_id: string;
}

describe.skipIf(!hasSupabaseInfra)("Test Helpers — test-setup.ts", () => {
  let org: TestOrganization;
  let user: TestUser;
  let branch: TestBranch;
  let branch2: TestBranch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let product: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let order: Record<string, any>;

  beforeAll(async () => {
    if (!hasSupabaseInfra) return;

    org = await createTestOrganization("Helper Tests Org", "basic");
    user = await createTestUser(org.id, "helper-user-" + Date.now() + "@test.com");
    branch = await createTestBranch(org.id, "Helper Branch 1", "HLP-1");
    branch2 = await createTestBranch(org.id, "Helper Branch 2", "HLP-2");
    product = await createTestProduct(org.id, branch.id, {
      name: "Helper Test Product",
      slug: "helper-product-" + Date.now(),
      price: 50000,
    });
    order = await createTestOrder(org.id, branch.id, {
      email: "helper-order-" + Date.now() + "@test.com",
      subtotal: 50000,
      total_amount: 50000,
    });
  });

  afterAll(async () => {
    if (!hasSupabaseInfra || !org) return;
    await cleanupTestData(org.id);
  });

  describe("createTestPosSession", () => {
    it("creates a POS session with status 'open'", async () => {
      const session: PosSessionResult = await createTestPosSession(
        branch.id,
        user.id,
      );

      expect(session.id).toBeDefined();
      expect(session.branch_id).toBe(branch.id);
      expect(session.status).toBe("open");
      expect(session.opening_time).toBeDefined();
      // opening_time should be a parseable date string
      expect(() => new Date(session.opening_time)).not.toThrow();
    });

    it("creates unique sessions for different branches", async () => {
      const [s1, s2]: [PosSessionResult, PosSessionResult] =
        await Promise.all([
          createTestPosSession(branch.id, user.id),
          createTestPosSession(branch2.id, user.id),
        ]);

      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe("createTestProductBranchStock", () => {
    it("creates stock with specified quantity", async () => {
      const stock: ProductBranchStockResult =
        await createTestProductBranchStock(product.id, branch.id, 10);

      expect(stock.id).toBeDefined();
      expect(stock.product_id).toBe(product.id);
      expect(stock.branch_id).toBe(branch.id);
      expect(stock.quantity).toBe(10);
    });

    it("upserts stock when called again with a different quantity", async () => {
      // First call sets to 10 (from previous test or fresh)
      await createTestProductBranchStock(product.id, branch.id, 10);

      // Second call upserts to 25
      const updated: ProductBranchStockResult =
        await createTestProductBranchStock(product.id, branch.id, 25);

      expect(updated.quantity).toBe(25);
    });
  });

  describe("createTestOrderPayment", () => {
    it("creates a cash payment with correct amount", async () => {
      const session: PosSessionResult = await createTestPosSession(
        branch.id,
        user.id,
      );
      const payment: OrderPaymentResult = await createTestOrderPayment(
        order.id,
        session.id,
        "cash",
        50000,
      );

      expect(payment.id).toBeDefined();
      expect(payment.order_id).toBe(order.id);
      expect(payment.amount).toBe(50000);
      expect(payment.payment_method).toBe("cash");
      expect(payment.pos_session_id).toBe(session.id);
    });

    it("creates payments with different methods and amounts", async () => {
      const session: PosSessionResult = await createTestPosSession(
        branch.id,
        user.id,
      );
      const [p1, p2]: [OrderPaymentResult, OrderPaymentResult] =
        await Promise.all([
          createTestOrderPayment(order.id, session.id, "debit", 25000),
          createTestOrderPayment(order.id, session.id, "transfer", 75000),
        ]);

      expect(p1.payment_method).toBe("debit");
      expect(p1.amount).toBe(25000);
      expect(p2.payment_method).toBe("transfer");
      expect(p2.amount).toBe(75000);
    });
  });
});
