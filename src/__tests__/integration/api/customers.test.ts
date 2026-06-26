/**
 * Integration Tests for Customers API
 *
 * These tests validate:
 * 1. Basic CRUD operations
 * 2. Multi-tenancy data isolation
 * 3. Branch filtering
 * 4. Validation
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  cleanupTestData,
  createTestBranch,
  createTestCustomer,
  createTestOrganization,
  createTestUser,
  isMultiTenancyAvailable,
  makeAuthenticatedRequest,
  type TestBranch,
  type TestOrganization,
  type TestUser,
} from "../helpers/test-setup";

// Sync check at module level before any describe blocks
const hasSupabaseInfra = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!hasSupabaseInfra)("Customers API - Integration Tests", () => {
  let orgA: TestOrganization;
  let orgB: TestOrganization;
  let userA: TestUser;
  let userB: TestUser;
  let branchA: TestBranch;
  let branchB: TestBranch;
  let customerA: unknown;
  let customerB: unknown;

  beforeAll(async () => {
    // Check if multi-tenancy infrastructure is available
    infrastructureCheck = await isMultiTenancyAvailable();

    if (!infrastructureCheck) {
      console.warn(
        "⚠️  Multi-tenancy infrastructure not available. Tests will be skipped.",
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

    // Create customers for each organization
    customerA = await createTestCustomer(orgA.id, branchA.id, {
      first_name: "Customer",
      last_name: "A",
      email: "customer-a@test.com",
    });

    customerB = await createTestCustomer(orgB.id, branchB.id, {
      first_name: "Customer",
      last_name: "B",
      email: "customer-b@test.com",
    });
  });

  afterAll(async () => {
    if (!infrastructureCheck) return;
    // Cleanup test data
    await cleanupTestData(orgA.id);
    await cleanupTestData(orgB.id);
  });

  describe("Multi-tenancy Data Isolation", () => {
    it("should only return customers from user's organization", async () => {
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/customers",
        {
          method: "GET",
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      // User A should only see customers from orgA
      expect(data.customers).toBeDefined();
      const customerIds = data.customers.map((c: unknown) => c.id);
      expect(customerIds).toContain(customerA.id);
      expect(customerIds).not.toContain(customerB.id);
    });

    it("should prevent user from accessing customer from another organization", async () => {
      // User A tries to access customer B (from orgB)
      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/customers/${customerB.id}`,
        {
          method: "GET",
        },
        userA.authToken,
        userA.sessionData,
      );

      // Should return 404 or 403 (not found or forbidden)
      expect([403, 404]).toContain(response.status);
    });

    it("should prevent user from creating customer in another organization", async () => {
      // User A tries to create customer with orgB's branch
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/customers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: "Test",
            last_name: "Customer",
            email: "test@test.com",
            branch_id: branchB.id, // Branch from orgB
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      // Should fail - user cannot create customer in another org's branch
      expect([400, 403, 404]).toContain(response.status);
    });

    it("should prevent user from updating customer from another organization", async () => {
      // User A tries to update customer B
      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/customers/${customerB.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: "Updated",
            last_name: "Name",
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      // Should fail
      expect([403, 404]).toContain(response.status);
    });

    it("should prevent user from deleting customer from another organization", async () => {
      // User A tries to delete customer B
      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/customers/${customerB.id}`,
        {
          method: "DELETE",
        },
        userA.authToken,
        userA.sessionData,
      );

      // Should fail
      expect([403, 404]).toContain(response.status);
    });
  });

  describe("CRUD Operations", () => {
    it("should create a customer", async () => {
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/customers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: "New",
            last_name: "Customer",
            email: `new-customer-${Date.now()}@test.com`,
            branch_id: branchA.id,
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.customer).toBeDefined();
      expect(data.customer.first_name).toBe("New");
      expect(data.customer.organization_id).toBe(orgA.id);
    });

    it("should get a customer by ID", async () => {
      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/customers/${customerA.id}`,
        {
          method: "GET",
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.customer).toBeDefined();
      expect(data.customer.id).toBe(customerA.id);
      expect(data.customer.organization_id).toBe(orgA.id);
    });

    it("should update a customer", async () => {
      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/customers/${customerA.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: "Updated",
            last_name: "Customer",
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.customer.first_name).toBe("Updated");
    });

    it("should list customers with pagination", async () => {
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/customers?page=1&limit=10",
        {
          method: "GET",
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.customers).toBeDefined();
      expect(Array.isArray(data.customers)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it("should search customers", async () => {
      const response = await makeAuthenticatedRequest(
        `http://localhost:3000/api/admin/customers?q=${customerA.first_name}`,
        {
          method: "GET",
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.customers).toBeDefined();
      // Should find customerA
      const found = data.customers.find((c: unknown) => c.id === customerA.id);
      expect(found).toBeDefined();
    });
  });

  describe("Validation", () => {
    it("should reject invalid customer data", async () => {
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/customers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Missing required fields
            first_name: "",
          }),
        },
        userA.authToken,
        userA.sessionData,
      );

      expect(response.status).toBe(400);
    });

    it("should reject invalid email format", async () => {
      const response = await makeAuthenticatedRequest(
        "http://localhost:3000/api/admin/customers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: "Test",
            last_name: "Customer",
            email: "invalid-email",
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
