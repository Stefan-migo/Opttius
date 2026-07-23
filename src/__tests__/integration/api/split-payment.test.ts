/**
 * Integration Tests: Split Payment via POS process-sale
 *
 * Covers:
 * - Split payment (cash + credit_card) — 2 payment records created
 * - Overpayment behavior (sum of payments > total)
 * - Partial payment with deposit_amount (pending balance)
 */

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  assignTestUserBranchAccess,
  cleanupTestData,
  createTestBranch,
  createTestOrganization,
  createTestPosSession,
  createTestProduct,
  createTestProductBranchStock,
  createTestUser,
  isMultiTenancyAvailable,
  makeAuthenticatedRequest,
  type TestBranch,
  type TestOrganization,
  type TestUser,
} from "../helpers/test-setup";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const hasSupabaseInfra = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

describe.skipIf(!hasSupabaseInfra)(
  "Split Payment - Integration Tests",
  { timeout: 15000 },
  () => {
    let infraOk = false;
    let org: TestOrganization;
    let user: TestUser;
    let branch: TestBranch;
    let productId: string;

    beforeAll(async () => {
      infraOk = await isMultiTenancyAvailable();
      if (!infraOk) return;

      org = await createTestOrganization("Split Payment Test", "basic");
      user = await createTestUser(org.id, `split-${Date.now()}@test.com`);
      branch = await createTestBranch(org.id, "Split Branch", "SPLIT");
      await assignTestUserBranchAccess(user.id, branch.id, "manager", true);

      const product = await createTestProduct(org.id, branch.id, {
        name: `Split Product ${Date.now()}`,
        price: 10000,
        product_type: "accessory",
      });
      productId = product.id;

      await createTestPosSession(branch.id, user.id);
      await createTestProductBranchStock(productId, branch.id, 10);
    });

    afterAll(async () => {
      if (infraOk && org?.id) await cleanupTestData(org.id);
    });

    it("returns 200 and creates 2 payment records for cash + credit_card split", async () => {
      const res = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/pos/process-sale`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method_type: "card",
            subtotal: 10000,
            tax_amount: 0,
            total_amount: 10000,
            items: [
              {
                product_id: productId,
                product_name: "Split Product",
                unit_price: 10000,
                quantity: 1,
              },
            ],
            payments: [
              { method: "cash", amount: 5000 },
              { method: "credit_card", amount: 5000 },
            ],
          }),
        },
        user.authToken,
        user.sessionData,
      );

      // RED: test written first — asserts real API behavior
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("order");
      expect(body.order).toHaveProperty("id");

      // Verify 2 payment records were persisted
      const supabase = createServiceRoleClient();
      const { data: payments, error } = await supabase
        .from("order_payments")
        .select("*")
        .eq("order_id", body.order.id);

      expect(error).toBeNull();
      expect(payments).toHaveLength(2);
      const totalPaid = (payments || []).reduce(
        (sum: number, p: { amount: number }) => sum + p.amount,
        0,
      );
      expect(totalPaid).toBe(10000);
    });

    it("handles overpayment where payments sum exceeds total", async () => {
      // TRIANGULATE: payments sum (12000) > total (10000)
      const res = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/pos/process-sale`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method_type: "card",
            subtotal: 10000,
            tax_amount: 0,
            total_amount: 10000,
            items: [
              {
                product_id: productId,
                product_name: "Split Product",
                unit_price: 10000,
                quantity: 1,
              },
            ],
            payments: [
              { method: "cash", amount: 6000 },
              { method: "credit_card", amount: 6000 },
            ],
          }),
        },
        user.authToken,
        user.sessionData,
      );

      // Schema allows sum >= total, RPC may accept or reject overpayment
      // This test documents actual behavior regardless
      const body = res.status === 200 ? await res.json() : null;
      if (body) {
        // Accepted — verify payments exceed total
        expect(body).toHaveProperty("order");
        const supabase = createServiceRoleClient();
        const { data: payments } = await supabase
          .from("order_payments")
          .select("*")
          .eq("order_id", body.order.id);
        expect(payments).toHaveLength(2);
        const totalPaid = (payments || []).reduce(
          (sum: number, p: { amount: number }) => sum + p.amount,
          0,
        );
        expect(totalPaid).toBe(12000);
      } else {
        // Rejected — business logic rejected overpayment
        expect(res.status).toBe(400);
      }
    });

    it("processes partial payment with deposit_amount and pending balance", async () => {
      // TRIANGULATE: payment (5000) < total (10000), no payments array
      const res = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/pos/process-sale`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method_type: "cash",
            subtotal: 10000,
            tax_amount: 0,
            total_amount: 10000,
            payment_status: "partial",
            deposit_amount: 5000,
            items: [
              {
                product_id: productId,
                product_name: "Split Product",
                unit_price: 10000,
                quantity: 1,
              },
            ],
          }),
        },
        user.authToken,
        user.sessionData,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("order");

      // Verify only 1 payment record with correct amount
      const supabase = createServiceRoleClient();
      const { data: payments } = await supabase
        .from("order_payments")
        .select("*")
        .eq("order_id", body.order.id);

      expect(payments).toHaveLength(1);
      expect(payments![0].amount).toBe(5000);
      expect(payments![0].payment_method).toBe("cash");
    });
  },
);
