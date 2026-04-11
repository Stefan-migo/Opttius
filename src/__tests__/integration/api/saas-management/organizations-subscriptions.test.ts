/**
 * Integration Tests for SaaS Organizations and Subscriptions API
 *
 * Tests critical flows:
 * - Crear organización (POST)
 * - Eliminar organización con confirmación (DELETE)
 * - Crear suscripción desde página dedicada (POST)
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  cleanupRootUser,
  createTestRootUser,
  isMultiTenancyAvailable,
  makeAuthenticatedRequest,
  type TestUser,
} from "../../helpers/test-setup";

const API_BASE = "http://localhost:3000";

describe("SaaS Organizations & Subscriptions API - Integration Tests", () => {
  let rootUser: TestUser;
  let infrastructureCheck = false;

  beforeAll(async () => {
    infrastructureCheck = await isMultiTenancyAvailable();

    if (!infrastructureCheck) {
      console.warn(
        "⚠️  Multi-tenancy infrastructure not available. Tests will be skipped.",
      );
      return;
    }

    rootUser = await createTestRootUser(
      `root-org-test-${Date.now()}@opttius.com`,
      "root",
    );
  });

  afterAll(async () => {
    if (!infrastructureCheck) return;
    await cleanupRootUser(rootUser.id);
  });

  describe("POST /api/admin/saas-management/organizations - Crear organización", () => {
    it("should create organization with valid data", async () => {
      if (!infrastructureCheck) return;

      const slug = `test-org-${Date.now()}`;
      const response = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/organizations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test Organization",
            slug,
            subscription_tier: "basic",
            status: "active",
          }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.organization).toBeDefined();
      expect(data.organization.name).toBe("Test Organization");
      expect(data.organization.slug).toBe(slug);
      expect(data.organization.subscription_tier).toBe("basic");

      // Cleanup: delete the org we just created
      await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/organizations/${data.organization.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );
    });

    it("should reject invalid slug format", async () => {
      if (!infrastructureCheck) return;

      const response = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/organizations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Test",
            slug: "Invalid Slug With Spaces",
            subscription_tier: "basic",
          }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/admin/saas-management/organizations/[id] - Eliminar organización", () => {
    it("should delete organization with confirm", async () => {
      if (!infrastructureCheck) return;

      // Create org first
      const slug = `to-delete-${Date.now()}`;
      const createRes = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/organizations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "To Delete",
            slug,
            subscription_tier: "basic",
            status: "active",
          }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );

      expect(createRes.status).toBe(201);
      const { organization } = await createRes.json();

      const deleteRes = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/organizations/${organization.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );

      expect(deleteRes.status).toBe(200);
      const deleteData = await deleteRes.json();
      expect(deleteData.success).toBe(true);
    });
  });

  describe("POST /api/admin/saas-management/subscriptions - Crear suscripción", () => {
    it("should create subscription for organization", async () => {
      if (!infrastructureCheck) return;

      // Create org first
      const slug = `sub-test-${Date.now()}`;
      const createOrgRes = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/organizations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Subscription Test Org",
            slug,
            subscription_tier: "basic",
            status: "active",
          }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );

      expect(createOrgRes.status).toBe(201);
      const { organization } = await createOrgRes.json();

      const createSubRes = await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/subscriptions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization_id: organization.id,
            status: "trialing",
            trial_days: 7,
          }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );

      expect(createSubRes.status).toBe(200);
      const subData = await createSubRes.json();
      expect(subData.subscription).toBeDefined();
      expect(subData.subscription.organization_id).toBe(organization.id);
      expect(subData.subscription.status).toBe("trialing");

      // Cleanup
      await makeAuthenticatedRequest(
        `${API_BASE}/api/admin/saas-management/organizations/${organization.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
        rootUser.authToken,
        rootUser.sessionData,
      );
    });
  });
});
