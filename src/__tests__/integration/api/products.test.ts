/**
 * Integration Tests for Products API
 *
 * These tests validate:
 * 1. Basic CRUD operations
 * 2. Multi-tenancy data isolation
 * 3. Branch filtering
 * 4. Validation
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  assignTestUserBranchAccess,
  cleanupTestData,
  createTestBranch,
  createTestOrganization,
  createTestProduct,
  createTestUser,
  isMultiTenancyAvailable,
  makeAuthenticatedRequest,
  type TestBranch,
  type TestOrganization,
  type TestUser,
} from "../helpers/test-setup";

// Check infrastructure availability - will be set in beforeAll
let infrastructureCheck = false;

describe("Products API - Integration Tests", () => {
  let orgA: TestOrganization;
  let orgB: TestOrganization;
  let userA: TestUser;
  let userB: TestUser;
  let branchA: TestBranch;
  let branchB: TestBranch;
  let productA: unknown;
  let productB: unknown;

  beforeAll(async () => {
    // Check if multi-tenancy infrastructure is available
    infrastructureCheck = await isMultiTenancyAvailable();

    if (!infrastructureCheck) {
      console.warn(
        "⚠️  Multi-tenancy infrastructure not available. Tests will be skipped.",
        "This is expected if Phase SaaS 0 has not been completed yet.",
      );
      return;
    }

    // Create two test organizations
    orgA = await createTestOrganization("Organization A", "basic");
    orgB = await createTestOrganization("Organization B", "basic");

    // Create users for each organization
    userA = await createTestUser(orgA.id, `user-a-${Date.now()}@test.com`);
    userB = await createTestUser(orgB.id, `user-b-${Date.now()}@test.com`);

    // Create branches for each organization
    branchA = await createTestBranch(orgA.id, "Branch A", "BRANCH-A");
    branchB = await createTestBranch(orgB.id, "Branch B", "BRANCH-B");

    // Assign branch access to users
    await assignTestUserBranchAccess(userA.id, branchA.id, "manager", true);
    await assignTestUserBranchAccess(userB.id, branchB.id, "manager", true);

    // Create products for each organization
    productA = await createTestProduct(orgA.id, branchA.id, {
      name: "Product A",
      price: 10000,
      status: "active",
    });

    productB = await createTestProduct(orgB.id, branchB.id, {
      name: "Product B",
      price: 20000,
      status: "active",
    });
  });

  afterAll(async () => {
    if (!infrastructureCheck) return;
    // Cleanup test data
    await cleanupTestData(orgA.id);
    await cleanupTestData(orgB.id);
  });

  describe("Multi-tenancy Data Isolation", () => {
    it("should only return products from user's organization", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/products",
        {
          method: "GET",
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      // Debug: Log response data
      console.log("[Test Debug] Products response:", {
        productsCount: data.products?.length || 0,
        productIds: data.products?.map((p: unknown) => p.id) || [],
        expectedProductA: productA.id,
        expectedProductB: productB.id,
        branchA: branchA.id,
        branchB: branchB.id,
      });

      // User A should only see products from orgA
      expect(data.products).toBeDefined();
      const productIds = data.products.map((p: unknown) => p.id);
      expect(productIds).toContain(productA.id);
      expect(productIds).not.toContain(productB.id);
    });

    it("should prevent user from accessing product from another organization", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      // User A tries to access product B (from orgB)
      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/products/${productB.id}`,
        {
          method: "GET",
        },
        userA.authToken,
        userA.sessionData,
      );

      // Should return 404 or 403 (not found or forbidden)
      expect([403, 404]).toContain(response.status);
    });

    it("should prevent user from creating product in another organization", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      // User A tries to create product with orgB's branch
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Test Product",
            price: 5000,
            branch_id: branchB.id, // Branch from orgB
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      // Should fail - user cannot create product in another org's branch
      expect([400, 403, 404]).toContain(response.status);
    });

    it("should prevent user from updating product from another organization", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      // User A tries to update product B
      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/products/${productB.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Updated Product",
            price: 25000,
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      // Should fail
      expect([403, 404]).toContain(response.status);
    });
  });

  describe("CRUD Operations", () => {
    it("should create a product", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `New Product ${Date.now()}`,
            price: 15000,
            branch_id: branchA.id,
            status: "active",
          }),
        },
        userA.authToken,
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.product).toBeDefined();
      expect(data.product.name).toContain("New Product");
      expect(data.product.organization_id).toBe(orgA.id);
    });

    it("should get a product by ID", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/products/${productA.id}`,
        {
          method: "GET",
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.product).toBeDefined();
      expect(data.product.id).toBe(productA.id);
      expect(data.product.organization_id).toBe(orgA.id);
    });

    it("should update a product", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/products/${productA.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Updated Product",
            price: 12000,
          }),
        },
        userA.authToken,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.product.name).toBe("Updated Product");
      expect(data.product.price).toBe(12000);
    });

    it("should list products with pagination", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/products?page=1&limit=10",
        {
          method: "GET",
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.products).toBeDefined();
      expect(Array.isArray(data.products)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it("should search products", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }

      // Create a specific product for this test to ensure isolation
      // This prevents the test from depending on the state of other tests
      // (e.g., if "should update a product" runs before this test)
      const searchTestProductName = `Searchable Product ${Date.now()}`;
      const searchTestProduct = await createTestProduct(orgA.id, branchA.id, {
        name: searchTestProductName,
        price: 15000,
        status: "active",
      });

      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/products?search=${encodeURIComponent(searchTestProductName)}`,
        {
          method: "GET",
        },
        userA.authToken,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.products).toBeDefined();
      expect(Array.isArray(data.products)).toBe(true);

      // Should find the product we just created
      const found = data.products.find(
        (p: unknown) => p.id === searchTestProduct.id,
      );
      expect(found).toBeDefined();
      expect(found?.name).toBe(searchTestProductName);
      expect(found?.organization_id).toBe(orgA.id);

      // Verify the search actually found the product by name
      // This validates that the search functionality works correctly
      expect(found?.name).toContain("Searchable Product");
    });

    it("should filter products by status", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/products?status=active",
        {
          method: "GET",
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.products).toBeDefined();
      // All returned products should be active
      data.products.forEach((p: unknown) => {
        expect(p.status).toBe("active");
      });
    });
  });

  describe("Validation", () => {
    it("should reject invalid product data", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Missing required fields (name and price)
            name: "",
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(400);
    });

    it("should reject product without name", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            price: 10000,
            branch_id: branchA.id,
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(400);
    });

    it("should reject product without price", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Test Product",
            branch_id: branchA.id,
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(400);
    });

    it("should reject negative price", async () => {
      if (!infrastructureCheck) {
        console.warn("Skipping test: infrastructure not available");
        return;
      }
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Test Product",
            price: -1000,
            branch_id: branchA.id,
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(400);
    });
  });
});
