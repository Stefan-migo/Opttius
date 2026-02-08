/**
 * Unit tests for Flow gateway integration
 *
 * @module __tests__/unit/lib/payments/flow-gateway.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlowGateway } from "@/lib/payments/flow/gateway";
import type { NextRequest } from "next/server";

// Mock environment variables
vi.stubEnv("FLOW_API_KEY", "test_api_key");
vi.stubEnv("FLOW_SECRET_KEY", "test_secret_key");
vi.stubEnv("FLOW_SANDBOX_MODE", "true");
vi.stubEnv("FLOW_API_KEY_SANDBOX", "test_sandbox_api_key");
vi.stubEnv("FLOW_SECRET_KEY_SANDBOX", "test_sandbox_secret_key");

describe("FlowGateway", () => {
  let gateway: FlowGateway;

  beforeEach(() => {
    gateway = new FlowGateway();
    vi.clearAllMocks();
  });

  describe("mapStatus", () => {
    it("should map pending status correctly", () => {
      expect(gateway.mapStatus("pending")).toBe("pending");
      expect(gateway.mapStatus("created")).toBe("pending");
    });

    it("should map approved status correctly", () => {
      expect(gateway.mapStatus("approved")).toBe("succeeded");
      expect(gateway.mapStatus("paid")).toBe("succeeded");
    });

    it("should map rejected status correctly", () => {
      expect(gateway.mapStatus("rejected")).toBe("failed");
      expect(gateway.mapStatus("cancelled")).toBe("failed");
      expect(gateway.mapStatus("refunded")).toBe("failed");
    });

    it("should map unknown status to pending", () => {
      expect(gateway.mapStatus("unknown_status")).toBe("pending");
    });
  });

  describe("createPaymentIntent", () => {
    it("should create a payment intent successfully", async () => {
      const mockResponse = {
        url: "https://flow.cl/payment/test_token",
        token: "test_token",
        flowOrder: 12345,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gateway.createPaymentIntent(
        "order_123",
        10000,
        "CLP",
        "user_123",
        "org_123",
      );

      expect(result).toEqual({
        paymentId: "test_token",
        approvalUrl: "https://flow.cl/payment/test_token",
        status: "pending",
        clientSecret: "test_token",
        gateway: "flow",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/payment/create"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should handle API errors gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "Invalid parameters" }),
      });

      await expect(
        gateway.createPaymentIntent(
          "order_123",
          10000,
          "CLP",
          "user_123",
          "org_123",
        ),
      ).rejects.toThrow("Flow API error: Invalid parameters");
    });

    it("should throw error when Flow credentials are missing", async () => {
      // Clear environment variables
      vi.stubEnv("FLOW_API_KEY", "");
      vi.stubEnv("FLOW_SECRET_KEY", "");
      vi.stubEnv("FLOW_API_KEY_SANDBOX", "");
      vi.stubEnv("FLOW_SECRET_KEY_SANDBOX", "");

      const freshGateway = new FlowGateway();

      await expect(
        freshGateway.createPaymentIntent(
          "order_123",
          10000,
          "CLP",
          "user_123",
          "org_123",
        ),
      ).rejects.toThrow("FLOW_API_KEY_SANDBOX and FLOW_SECRET_KEY_SANDBOX");
    });
  });

  describe("processWebhookEvent", () => {
    it("should process a successful payment webhook", async () => {
      // Create a proper NextRequest with FormData
      const formData = new FormData();
      formData.append("token", "test_token");
      formData.append("status", "2"); // approved
      formData.append("commerceOrder", "order_123");
      formData.append("subject", "Test Payment");
      formData.append("amount", "10000");
      formData.append("currency", "CLP");

      const request = new Request("http://localhost:3000/api/webhooks/flow", {
        method: "POST",
        body: formData,
      }) as unknown as NextRequest;

      const result = await gateway.processWebhookEvent(request);

      expect(result).toEqual({
        gateway: "flow",
        gatewayEventId: "test_token",
        type: "payment_status",
        status: "succeeded",
        gatewayTransactionId: "test_token",
        gatewayPaymentIntentId: "test_token",
        amount: 10000,
        currency: "CLP",
        orderId: "order_123",
        organizationId: null,
        metadata: {
          token: "test_token",
          flowOrder: undefined,
          commerceOrder: "order_123",
          status: "2",
        },
      });
    });

    it("should process a failed payment webhook", async () => {
      // Create a proper NextRequest with FormData
      const formData = new FormData();
      formData.append("token", "test_token");
      formData.append("status", "3"); // rejected
      formData.append("commerceOrder", "order_123");
      formData.append("subject", "Test Payment");
      formData.append("amount", "10000");
      formData.append("currency", "CLP");

      const request = new Request("http://localhost:3000/api/webhooks/flow", {
        method: "POST",
        body: formData,
      }) as unknown as NextRequest;

      const result = await gateway.processWebhookEvent(request);

      expect(result.status).toBe("failed");
      expect(result.type).toBe("payment_status");
    });

    it("should handle missing required fields", async () => {
      // Create a proper NextRequest with FormData missing required fields
      const formData = new FormData();
      formData.append("token", "test_token");
      // missing status
      formData.append("commerceOrder", "order_123");

      const request = new Request("http://localhost:3000/api/webhooks/flow", {
        method: "POST",
        body: formData,
      }) as unknown as NextRequest;

      await expect(gateway.processWebhookEvent(request)).rejects.toThrow(
        "Flow Webhook: missing required fields",
      );
    });
  });
});
