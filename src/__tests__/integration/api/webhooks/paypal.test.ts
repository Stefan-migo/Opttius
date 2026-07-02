/**
 * Integration tests for PayPal webhook endpoint
 *
 * @module __tests__/integration/api/webhooks/paypal.test
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/webhooks/paypal/route";

// Use vi.hoisted to define mocks before vi.mock factories run (vitest auto-hoisting)
const {
  mockValidateWebhookSignature,
  mockProcessWebhookEvent,
  mockRecordWebhookEvent,
  mockGetPaymentByGatewayPaymentIntentId,
  mockUpdatePaymentStatus,
  mockMarkWebhookEventAsProcessed,
  mockFulfillOrder,
} = vi.hoisted(() => ({
  mockValidateWebhookSignature: vi.fn(),
  mockProcessWebhookEvent: vi.fn(),
  mockRecordWebhookEvent: vi.fn(),
  mockGetPaymentByGatewayPaymentIntentId: vi.fn(),
  mockUpdatePaymentStatus: vi.fn(),
  mockMarkWebhookEventAsProcessed: vi.fn(),
  mockFulfillOrder: vi.fn(),
}));

vi.mock("@/lib/payments/paypal/gateway", () => {
  class MockPayPalGateway {
    validateWebhookSignature = mockValidateWebhookSignature;
    processWebhookEvent = mockProcessWebhookEvent;
  }
  return { PayPalGateway: MockPayPalGateway };
});

vi.mock("@/lib/payments/services/payment-service", () => {
  class MockPaymentService {
    recordWebhookEvent = mockRecordWebhookEvent;
    getPaymentByGatewayPaymentIntentId = mockGetPaymentByGatewayPaymentIntentId;
    updatePaymentStatus = mockUpdatePaymentStatus;
    markWebhookEventAsProcessed = mockMarkWebhookEventAsProcessed;
    fulfillOrder = mockFulfillOrder;
  }
  return { PaymentService: MockPaymentService };
});

vi.mock("@/lib/logger", () => ({
  appLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/utils/supabase/webhook", () => ({
  createWebhookClient: vi.fn(() => ({})),
}));

function makeValidHeaders(): Record<string, string> {
  return {
    "content-type": "application/json",
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.paypal.com/v1/notifications/certs/CERT-123",
    "paypal-transmission-id": "test_transmission_id",
    "paypal-transmission-sig": "test_signature",
    "paypal-transmission-time": "2026-02-07T10:00:00Z",
  };
}

describe("PayPal Webhook API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: signature valid, process succeeds
    mockValidateWebhookSignature.mockResolvedValue(true);
    mockProcessWebhookEvent.mockResolvedValue({
      gateway: "paypal",
      gatewayEventId: "test_event_id",
      type: "PAYMENT.CAPTURE.COMPLETED",
      status: "succeeded",
      gatewayTransactionId: "test_capture_id",
      gatewayPaymentIntentId: "test_capture_id",
      amount: 100,
      currency: "USD",
      orderId: "order_123",
      organizationId: null,
      metadata: { id: "test_event_id" },
    });
    mockRecordWebhookEvent.mockResolvedValue(false);
    mockGetPaymentByGatewayPaymentIntentId.mockResolvedValue({
      id: "payment_123",
      order_id: "order_123",
    });
    mockUpdatePaymentStatus.mockResolvedValue(undefined);
    mockMarkWebhookEventAsProcessed.mockResolvedValue(undefined);
    mockFulfillOrder.mockResolvedValue(undefined);
  });

  describe("POST /api/webhooks/paypal", () => {
    it("should process a successful payment webhook with valid signature", async () => {
      const webhookPayload = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "test_capture_id",
          status: "COMPLETED",
          amount: { value: "100.00", currency_code: "USD" },
          purchase_units: [{ reference_id: "order_123" }],
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: makeValidHeaders(),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true });
      expect(mockValidateWebhookSignature).toHaveBeenCalledTimes(1);
    });

    it("should return 401 when signature is invalid", async () => {
      mockValidateWebhookSignature.mockResolvedValue(false);

      const webhookPayload = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "test_capture_id",
          status: "COMPLETED",
          amount: { value: "100.00", currency_code: "USD" },
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: makeValidHeaders(),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Invalid signature" });
      expect(mockProcessWebhookEvent).not.toHaveBeenCalled();
    });

    it("should return 401 when PayPal signature headers are missing", async () => {
      const webhookPayload = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "test_capture_id",
          status: "COMPLETED",
          amount: { value: "100.00", currency_code: "USD" },
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: { "content-type": "application/json" },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Invalid signature" });
    });

    it("should return 401 when validateWebhookSignature API fails", async () => {
      mockValidateWebhookSignature.mockResolvedValue(false);

      const webhookPayload = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "test_capture_id",
          status: "COMPLETED",
          amount: { value: "100.00", currency_code: "USD" },
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: makeValidHeaders(),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(401);
      expect(mockProcessWebhookEvent).not.toHaveBeenCalled();
    });

    it("should process a failed payment webhook", async () => {
      mockProcessWebhookEvent.mockResolvedValue({
        gateway: "paypal",
        gatewayEventId: "test_event_id",
        type: "PAYMENT.CAPTURE.DECLINED",
        status: "failed",
        gatewayTransactionId: "test_capture_id",
        gatewayPaymentIntentId: "test_capture_id",
        amount: 100,
        currency: "USD",
        orderId: "order_123",
        organizationId: null,
        metadata: { id: "test_event_id" },
      });

      const webhookPayload = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.DECLINED",
        resource: {
          id: "test_capture_id",
          status: "DECLINED",
          amount: { value: "100.00", currency_code: "USD" },
          purchase_units: [{ reference_id: "order_123" }],
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: makeValidHeaders(),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockValidateWebhookSignature).toHaveBeenCalledTimes(1);
    });

    it("should handle webhook processing errors gracefully", async () => {
      mockProcessWebhookEvent.mockRejectedValue(
        new Error("Invalid webhook data"),
      );

      const webhookPayload = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: null,
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: makeValidHeaders(),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should handle missing event type", async () => {
      mockProcessWebhookEvent.mockRejectedValue(
        new Error("PayPal Webhook: Unhandled event type or missing data"),
      );

      const webhookPayload = {
        id: "test_event_id",
        resource: {
          id: "test_capture_id",
          status: "COMPLETED",
          amount: { value: "100.00", currency_code: "USD" },
          purchase_units: [{ reference_id: "order_123" }],
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/paypal",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: makeValidHeaders(),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
