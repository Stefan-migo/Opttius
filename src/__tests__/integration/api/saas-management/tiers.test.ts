/**
 * Integration Tests for SaaS Tiers API
 *
 * Tests:
 * - GET /api/admin/saas-management/tiers (root): returns tiers with stats
 * - PATCH /api/admin/saas-management/tiers (root): updates tier, NULL for unlimited
 * - GET without auth: 403
 * - PATCH with invalid body: 400
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestRootUser,
  cleanupRootUser,
  makeAuthenticatedRequest,
  isMultiTenancyAvailable,
  type TestUser,
} from "../../helpers/test-setup";

const API_BASE = "http://localhost:3000";

describe("SaaS Tiers API - Integration Tests", () => {
  let rootUser: TestUser;
  let infrastructureCheck = false;

  beforeAll(async () => {
    infrastructureCheck = await isMultiTenancyAvailable();

    if (!infrastructureCheck) {
      console.warn(
        "⚠️  Multi-tenancy infrastructure not available. Tiers tests will be skipped.",
      );
      return;
    }

    rootUser = await createTestRootUser(
      `root-tiers-test-${Date.now()}@opttius.com`,
      "root",
    );
  });

  afterAll(async () => {
    if (!infrastructureCheck) return;
    await cleanupRootUser(rootUser.id);
  });

  describe("GET /api/admin/saas-management/tiers", () => {
    it("should return tiers with stats for root user", async () => {
      if (!infrastructureCheck) return;

      const response = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/tiers`,
        { method: "GET" },
        rootUser.authToken,
        rootUser.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tiers).toBeDefined();
      expect(Array.isArray(data.tiers)).toBe(true);
      expect(data.tiers.length).toBeGreaterThanOrEqual(1);

      const firstTier = data.tiers[0];
      expect(firstTier).toHaveProperty("name");
      expect(firstTier).toHaveProperty("price_monthly");
      expect(firstTier).toHaveProperty("features");
      expect(firstTier).toHaveProperty("stats");
      expect(firstTier.stats).toHaveProperty("totalOrganizations");
      expect(firstTier.stats).toHaveProperty("activeOrganizations");
      expect(firstTier.stats).toHaveProperty("estimatedMonthlyRevenue");
    });

    it("should return 403 without auth", async () => {
      if (!infrastructureCheck) return;

      const response = await fetch(
        `${API_BASE}/api/admin/saas-management/tiers`,
      );

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /api/admin/saas-management/tiers", () => {
    it("should update tier and store null for unlimited (0)", async () => {
      if (!infrastructureCheck) return;

      // Get current basic tier
      const getRes = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/tiers`,
        { method: "GET" },
        rootUser.authToken,
        rootUser.sessionData,
      );
      expect(getRes.status).toBe(200);
      const { tiers } = await getRes.json();
      const basicTier = tiers.find((t: { name: string }) => t.name === "basic");
      if (!basicTier) {
        console.warn("Basic tier not found, skipping PATCH test");
        return;
      }

      const originalMaxCustomers = basicTier.max_customers;

      // Update with max_customers: 0 (should store as null for unlimited)
      const patchRes = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/tiers`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "basic",
            max_customers: 0,
          }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );

      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.tier.max_customers).toBeNull();

      // Restore original value
      await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/tiers`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "basic",
            max_customers: originalMaxCustomers ?? 500,
          }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );
    });

    it("should reject invalid tier name", async () => {
      if (!infrastructureCheck) return;

      const response = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/tiers`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "invalid_tier",
            price_monthly: 100,
          }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );

      expect(response.status).toBe(400);
    });

    it("should reject negative price_monthly", async () => {
      if (!infrastructureCheck) return;

      const response = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/tiers`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "basic",
            price_monthly: -10,
          }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );

      expect(response.status).toBe(400);
    });
  });
});
