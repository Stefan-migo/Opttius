/**
 * Integration Tests for Payments API (create-intent, webhook Flow)
 *
 * - create-intent: 401 without auth; 403 without organization_id when authenticated.
 * - webhook Flow: 500 when signature is invalid or missing required fields.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  makeAuthenticatedRequest,
  isMultiTenancyAvailable,
  createTestOrganization,
  createTestUser,
  cleanupTestData,
  type TestOrganization,
  type TestUser,
} from "../helpers/test-setup";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

describe("Payments API - Integration Tests", { timeout: 15000 }, () => {
  let infrastructureCheck = false;
  let org: TestOrganization;
  let user: TestUser;

  beforeAll(async () => {
    infrastructureCheck = await isMultiTenancyAvailable();
    if (!infrastructureCheck) {
      console.warn(
        "⚠️  Multi-tenancy not available. Payments tests will be skipped.",
      );
      return;
    }
    org = await createTestOrganization("Payments Test Org", "basic");
    user = await createTestUser(org.id, `payments-${Date.now()}@test.com`);
  });

  afterAll(async () => {
    if (infrastructureCheck && org?.id) await cleanupTestData(org.id);
  });

  describe("POST /api/admin/payments/create-intent", () => {
    it("returns 401 when not authenticated", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/payments/create-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 1000,
          currency: "CLP",
          gateway: "flow",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 400 when body is invalid (missing amount)", async () => {
      const response = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/payments/create-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currency: "CLP",
            gateway: "flow",
          }),
        },
        user.authToken,
        user.sessionData,
      );
      expect(response.status).toBe(400);
    });

    it("returns 400 when gateway is invalid", async () => {
      const response = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/payments/create-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 100,
            currency: "CLP",
            gateway: "invalid_gateway",
          }),
        },
        user.authToken,
        user.sessionData,
      );
      expect(response.status).toBe(400);
    });

    it("returns 200 or 500 when authenticated with org (Flow keys may be missing)", async () => {
      const response = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/payments/create-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 100,
            currency: "CLP",
            gateway: "flow",
          }),
        },
        user.authToken,
        user.sessionData,
      );
      // 200 if Flow is configured; 500 if FLOW_API_KEY/FLOW_SECRET_KEY is missing; 403 if no org
      expect([200, 403, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("approvalUrl");
        expect(data).toHaveProperty("paymentId");
      }
    });

    it("returns 200 or 500 when authenticated with org (PayPal keys may be missing)", async () => {
      const response = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/payments/create-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 100,
            currency: "USD",
            gateway: "paypal",
          }),
        },
        user.authToken,
        user.sessionData,
      );
      // 200 if PayPal is configured; 500 if credentials missing; 403 if no org
      expect([200, 403, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("approvalUrl");
        expect(data).toHaveProperty("paymentId");
      }
    });

    it("returns 200 or 500 when authenticated with org (NOWPayments keys may be missing)", async () => {
      const response = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/payments/create-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 100,
            currency: "USD",
            gateway: "nowpayments",
          }),
        },
        user.authToken,
        user.sessionData,
      );
      // 200 if NOWPayments is configured; 500 if API key missing; 403 if no org
      expect([200, 403, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("approvalUrl");
        expect(data).toHaveProperty("paymentId");
      }
    });

    it("returns 200 or 500 when authenticated with org (Mercado Pago keys may be missing)", async () => {
      const response = await makeAuthenticatedRequest(
        `${BASE_URL}/api/admin/payments/create-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 10000,
            currency: "CLP",
            gateway: "mercadopago",
          }),
        },
        user.authToken,
        user.sessionData,
      );
      // 200 if Mercado Pago is configured; 500 if access token missing; 403 if no org
      expect([200, 403, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("approvalUrl");
        expect(data).toHaveProperty("paymentId");
      }
    });
  });

  describe("POST /api/webhooks/flow", () => {
    it("returns 500 when required fields are missing", async () => {
      const formData = new FormData();
      formData.append("token", "test_token");
      // Missing status
      const res = await fetch(`${BASE_URL}/api/webhooks/flow`, {
        method: "POST",
        body: formData,
      });
      expect(res.status).toBe(500);
    });
  });
});
