/**
 * Integration tests for PayPal webhook endpoint
 *
 * @module __tests__/integration/api/webhooks/paypal.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/webhooks/paypal/route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/payments", () => ({
  PaymentGatewayFactory: {
    getGateway: vi.fn(() => ({
      processWebhookEvent: vi.fn(async (request) => {
        const eventData = await request.json();
        return {
          gateway: "paypal",
          gatewayEventId: eventData.id,
          type: eventData.event_type,
          status: eventData.event_type.includes("COMPLETED")
            ? "succeeded"
            : "failed",
          gatewayTransactionId: eventData.resource?.id,
          gatewayPaymentIntentId: eventData.resource?.id,
          amount: parseFloat(eventData.resource?.amount?.value || "0"),
          currency: eventData.resource?.amount?.currency_code || "USD",
          orderId: eventData.resource?.custom_id || null,
          organizationId: null,
          metadata: eventData,
        };
      }),
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

describe("PayPal Webhook API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/webhooks/paypal", () => {
    it("should process a successful payment webhook", async () => {
      const webhookPayload = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "test_capture_id",
          status: "COMPLETED",
          amount: {
            value: "100.00",
            currency_code: "USD",
          },
          custom_id: "order_123",
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: {
            "content-type": "application/json",
            "paypal-auth-algo": "SHA256withRSA",
            "paypal-cert-url":
              "https://api.paypal.com/v1/notifications/certs/CERT-123",
            "paypal-transmission-id": "test_transmission_id",
            "paypal-transmission-sig": "test_signature",
            "paypal-transmission-time": "2026-02-07T10:00:00Z",
          },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ status: "ok" });
    });

    it("should process a failed payment webhook", async () => {
      const webhookPayload = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.DECLINED",
        resource: {
          id: "test_capture_id",
          status: "DECLINED",
          amount: {
            value: "100.00",
            currency_code: "USD",
          },
          custom_id: "order_123",
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: {
            "content-type": "application/json",
          },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ok");
    });

    it("should handle webhook processing errors gracefully", async () => {
      const { PaymentGatewayFactory } = await import("@/lib/payments");
      vi.mocked(PaymentGatewayFactory.getGateway).mockReturnValue({
        processWebhookEvent: vi.fn(async () => {
          throw new Error("Invalid webhook data");
        }),
      } as any);

      const webhookPayload = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: null, // Invalid data
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: {
            "content-type": "application/json",
          },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Still return 200 to prevent retries
      expect(data.status).toBe("error");
      expect(data.message).toBeDefined();
    });

    it("should return 400 for invalid JSON payload", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: "invalid json",
          headers: {
            "content-type": "application/json",
          },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500); // PayPal route returns 500 for JSON parse errors
      expect(data.error).toBeDefined();
    });

    it("should handle missing event type", async () => {
      const webhookPayload = {
        id: "test_event_id",
        // missing event_type
        resource: {
          id: "test_capture_id",
          status: "COMPLETED",
          amount: {
            value: "100.00",
            currency_code: "USD",
          },
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: {
            "content-type": "application/json",
          },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("error");
    });
  });
});
