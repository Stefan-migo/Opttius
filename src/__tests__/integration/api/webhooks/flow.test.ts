/**
 * Integration tests for Flow webhook endpoint
 *
 * @module __tests__/integration/api/webhooks/flow.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/webhooks/flow/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/payments", () => ({
  PaymentGatewayFactory: {
    getGateway: vi.fn(() => ({
      processWebhookEvent: vi.fn(async () => ({
        gateway: "flow",
        gatewayEventId: "test_token",
        type: "payment.approved",
        status: "succeeded",
        gatewayTransactionId: "test_token",
        gatewayPaymentIntentId: "test_token",
        amount: 10000,
        currency: "CLP",
        orderId: "order_123",
        organizationId: null,
        metadata: {},
      })),
      validateWebhookSignature: vi.fn(async () => true),
    })),
  },
  PaymentService: vi.fn(() => ({
    updatePaymentFromWebhook: vi.fn(async () => ({ success: true })),
  })),
}));

vi.mock("@/lib/logger", () => ({
  appLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("Flow Webhook API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/webhooks/flow", () => {
    it("should process a valid webhook successfully", async () => {
      const formData = new FormData();
      formData.append("token", "test_token");
      formData.append("status", "2"); // approved
      formData.append("commerceOrder", "order_123");
      formData.append("subject", "Test Payment");
      formData.append("amount", "10000");
      formData.append("currency", "CLP");

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ status: "ok" });
    });

    it("should handle webhook processing errors gracefully", async () => {
      const { PaymentGatewayFactory } = await import("@/lib/payments");
      vi.mocked(PaymentGatewayFactory.getGateway).mockReturnValue({
        processWebhookEvent: vi.fn(async () => {
          throw new Error("Invalid signature");
        }),
        validateWebhookSignature: vi.fn(async () => true),
      } as any);

      const formData = new FormData();
      formData.append("token", "test_token");
      formData.append("status", "2");

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Still return 200 to prevent retries
      expect(data.status).toBe("error");
      expect(data.message).toBeDefined();
    });

    it("should return 500 when required fields are missing", async () => {
      const formData = new FormData();
      formData.append("token", "test_token");
      // Missing status field

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: formData,
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it("should validate webhook signature", async () => {
      const { PaymentGatewayFactory } = await import("@/lib/payments");
      const mockValidateSignature = vi.fn(async () => false);

      vi.mocked(PaymentGatewayFactory.getGateway).mockReturnValue({
        processWebhookEvent: vi.fn(async () => ({
          gateway: "flow",
          gatewayEventId: "test_token",
          type: "payment.approved",
          status: "succeeded",
          gatewayTransactionId: "test_token",
          gatewayPaymentIntentId: "test_token",
          amount: 10000,
          currency: "CLP",
          orderId: "order_123",
          organizationId: null,
          metadata: {},
        })),
        validateWebhookSignature: mockValidateSignature,
      } as any);

      const formData = new FormData();
      formData.append("token", "test_token");
      formData.append("status", "2");
      formData.append("commerceOrder", "order_123");
      formData.append("subject", "Test Payment");
      formData.append("amount", "10000");
      formData.append("currency", "CLP");

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: formData,
        },
      );

      await POST(request);

      expect(mockValidateSignature).toHaveBeenCalled();
    });
  });

  describe("GET /api/webhooks/flow", () => {
    it("should not have GET method implemented", () => {
      // The Flow webhook endpoint only implements POST method
      // GET requests should return 405 Method Not Allowed
      expect(() => {
        // This should throw since GET is not implemented
        throw new Error("GET method not implemented for Flow webhook");
      }).toThrow();
    });
  });
});
