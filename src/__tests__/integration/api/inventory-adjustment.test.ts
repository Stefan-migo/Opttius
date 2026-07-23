/**
 * Integration Tests: Inventory Adjustment via POS process-sale
 *
 * Covers:
 * - Stock reduction after process-sale (verify qty decreases)
 * - Stock insufficient error (400)
 * - Per-branch stock independence (transfer-like scenario)
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
  "Inventory Adjustment - Integration Tests",
  { timeout: 15000 },
  () => {
    let infraOk = false;
    let org: TestOrganization;
    let user: TestUser;
    let branchA: TestBranch;
    let branchB: TestBranch;
    let productId: string;

    beforeAll(async () => {
      infraOk = await isMultiTenancyAvailable();
      if (!infraOk) return;

      org = await createTestOrganization("Inventory Test", "basic");
      user = await createTestUser(org.id, `inv-${Date.now()}@test.com`);
      branchA = await createTestBranch(org.id, "Branch A", "BR-A");
      branchB = await createTestBranch(org.id, "Branch B", "BR-B");

      await assignTestUserBranchAccess(user.id, branchA.id, "manager", true);
      await assignTestUserBranchAccess(user.id, branchB.id, "manager", false);

      const product = await createTestProduct(org.id, branchA.id, {
        name: `Frame Product ${Date.now()}`,
        price: 50000,
        product_type: "frame",
      });
      productId = product.id;

      // POS session for branch A
      await createTestPosSession(branchA.id, user.id);
    });

    afterAll(async () => {
      if (infraOk && org?.id) await cleanupTestData(org.id);
    });

    it("reduces stock after process-sale", async () => {
      // RED: test written first — asserts stock decreases from 10 to 7
      await createTestProductBranchStock(productId, branchA.id, 10);

      const res = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/pos/process-sale`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method_type: "cash",
            subtotal: 150000,
            tax_amount: 0,
            total_amount: 150000,
            items: [
              {
                product_id: productId,
                product_name: "Frame Product",
                unit_price: 50000,
                quantity: 3,
              },
            ],
            payments: [{ method: "cash", amount: 150000 }],
          }),
        },
        user.authToken,
        user.sessionData,
      );

      expect(res.status).toBe(200);

      // Verify stock reduced from 10 to 7
      const supabase = createServiceRoleClient();
      const { data: updatedStock, error } = await supabase
        .from("product_branch_stock")
        .select("quantity")
        .eq("product_id", productId)
        .eq("branch_id", branchA.id)
        .single();

      expect(error).toBeNull();
      expect(updatedStock).not.toBeNull();
      expect(updatedStock!.quantity).toBe(7);
    });

    it("returns 400 when stock is insufficient", async () => {
      // TRIANGULATE: different code path — stock check fails before order creation
      await createTestProductBranchStock(productId, branchA.id, 10);

      const res = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/pos/process-sale`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method_type: "cash",
            subtotal: 1000000,
            tax_amount: 0,
            total_amount: 1000000,
            items: [
              {
                product_id: productId,
                product_name: "Frame Product",
                unit_price: 50000,
                quantity: 20,
              },
            ],
            payments: [{ method: "cash", amount: 1000000 }],
          }),
        },
        user.authToken,
        user.sessionData,
      );

      expect(res.status).toBe(400);
    });

    it("manages stock independently per branch", async () => {
      // TRIANGULATE: sell from branch B, verify only B's stock decreases
      await createTestProductBranchStock(productId, branchA.id, 10);
      await createTestProductBranchStock(productId, branchB.id, 5);
      await createTestPosSession(branchB.id, user.id);

      // Sell 3 from branch A (primary branch, no header needed)
      const resA = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/pos/process-sale`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method_type: "cash",
            subtotal: 150000,
            tax_amount: 0,
            total_amount: 150000,
            items: [
              {
                product_id: productId,
                product_name: "Frame Product",
                unit_price: 50000,
                quantity: 3,
              },
            ],
            payments: [{ method: "cash", amount: 150000 }],
          }),
        },
        user.authToken,
        user.sessionData,
      );
      expect(resA.status).toBe(200);

      // Sell 2 from branch B via x-branch-id header
      const resB = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/pos/process-sale`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-branch-id": branchB.id,
          },
          body: JSON.stringify({
            payment_method_type: "cash",
            subtotal: 100000,
            tax_amount: 0,
            total_amount: 100000,
            items: [
              {
                product_id: productId,
                product_name: "Frame Product",
                unit_price: 50000,
                quantity: 2,
              },
            ],
            payments: [{ method: "cash", amount: 100000 }],
          }),
        },
        user.authToken,
        user.sessionData,
      );
      expect(resB.status).toBe(200);

      // Verify stock per branch
      const supabase = createServiceRoleClient();
      const { data: stockA } = await supabase
        .from("product_branch_stock")
        .select("quantity")
        .eq("product_id", productId)
        .eq("branch_id", branchA.id)
        .single();
      expect(stockA).not.toBeNull();
      expect(stockA!.quantity).toBe(7); // 10 - 3

      const { data: stockB } = await supabase
        .from("product_branch_stock")
        .select("quantity")
        .eq("product_id", productId)
        .eq("branch_id", branchB.id)
        .single();
      expect(stockB).not.toBeNull();
      expect(stockB!.quantity).toBe(3); // 5 - 2
    });
  },
);
