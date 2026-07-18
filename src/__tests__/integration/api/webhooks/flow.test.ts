/**
 * Integration tests for Flow webhook endpoint
 *
 * @module __tests__/integration/api/webhooks/flow.test
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/webhooks/flow/route";

// Use vi.hoisted to define mocks before vi.mock factories run (vitest auto-hoisting)
const {
  mockProcessWebhookEvent,
  mockRecordWebhookEvent,
  mockGetPaymentByGatewayPaymentIntentId,
  mockUpdatePaymentStatus,
  mockMarkWebhookEventAsProcessed,
  mockFulfillOrder,
} = vi.hoisted(() => ({
  mockProcessWebhookEvent: vi.fn(),
  mockRecordWebhookEvent: vi.fn(),
  mockGetPaymentByGatewayPaymentIntentId: vi.fn(),
  mockUpdatePaymentStatus: vi.fn(),
  mockMarkWebhookEventAsProcessed: vi.fn(),
  mockFulfillOrder: vi.fn(),
}));

vi.mock("@/lib/payments/flow/gateway", () => {
  class MockFlowGateway {
    processWebhookEvent = mockProcessWebhookEvent;
  }
  return { FlowGateway: MockFlowGateway };
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

function makeFormData(params: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(params)) {
    fd.append(key, value);
  }
  return fd;
}

describe("Flow Webhook API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: process succeeds with pending status
    mockProcessWebhookEvent.mockResolvedValue({
      gateway: "flow",
      gatewayEventId: "test_token",
      type: "payment_status",
      status: "pending",
      gatewayTransactionId: "test_flow_order",
      gatewayPaymentIntentId: "test_flow_order",
      amount: 10000,
      currency: "CLP",
      orderId: "order_123",
      organizationId: null,
      metadata: {
        token: "test_token",
        flowOrder: "test_flow_order",
        commerceOrder: "order_order_123",
        status: "2",
      },
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

  describe("POST /api/webhooks/flow", () => {
    it("should process a payment webhook successfully", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: makeFormData({
            token: "test_token",
            status: "2",
            flowOrder: "test_flow_order",
            commerceOrder: "order_order_123",
            amount: "10000",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true });
      expect(mockProcessWebhookEvent).toHaveBeenCalledTimes(1);
      expect(mockUpdatePaymentStatus).toHaveBeenCalled();
      expect(mockMarkWebhookEventAsProcessed).toHaveBeenCalled();
    });

    it("should handle already processed events", async () => {
      mockRecordWebhookEvent.mockResolvedValue(true);

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: makeFormData({
            token: "test_token",
            status: "2",
            flowOrder: "test_flow_order",
            commerceOrder: "order_order_123",
            amount: "10000",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true, message: "Already processed" });
      expect(mockGetPaymentByGatewayPaymentIntentId).not.toHaveBeenCalled();
    });

    it("should handle missing payment intent ID", async () => {
      mockProcessWebhookEvent.mockResolvedValue({
        gateway: "flow",
        gatewayEventId: "test_token",
        type: "payment_status",
        status: "pending",
        gatewayTransactionId: null,
        gatewayPaymentIntentId: null,
        amount: 10000,
        currency: "CLP",
        orderId: null,
        organizationId: null,
        metadata: {
          token: "test_token",
          flowOrder: null,
          commerceOrder: null,
          status: "2",
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: makeFormData({
            token: "test_token",
            status: "2",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        received: true,
        message: "Event has no payment intent ID",
      });
      expect(
        mockGetPaymentByGatewayPaymentIntentId,
      ).not.toHaveBeenCalled();
    });

    it("should handle payment not found internally", async () => {
      mockGetPaymentByGatewayPaymentIntentId.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: makeFormData({
            token: "test_token",
            status: "2",
            flowOrder: "test_flow_order",
            commerceOrder: "order_order_123",
            amount: "10000",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        received: true,
        message: "Payment not found internally",
      });
      expect(mockUpdatePaymentStatus).not.toHaveBeenCalled();
    });

    it("should fulfill order when payment succeeds", async () => {
      mockProcessWebhookEvent.mockResolvedValue({
        gateway: "flow",
        gatewayEventId: "test_token",
        type: "payment_status",
        status: "succeeded",
        gatewayTransactionId: "test_flow_order",
        gatewayPaymentIntentId: "test_flow_order",
        amount: 10000,
        currency: "CLP",
        orderId: "order_123",
        organizationId: null,
        metadata: {
          token: "test_token",
          flowOrder: "test_flow_order",
          commerceOrder: "order_order_123",
          status: "1",
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: makeFormData({
            token: "test_token",
            status: "1",
            flowOrder: "test_flow_order",
            commerceOrder: "order_order_123",
            amount: "10000",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true });
      expect(mockFulfillOrder).toHaveBeenCalledWith("order_123");
    });

    it("should return 500 when required fields are missing", async () => {
      mockProcessWebhookEvent.mockRejectedValue(
        new Error("Flow Webhook: missing required fields"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: new FormData(),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(mockRecordWebhookEvent).not.toHaveBeenCalled();
    });

    it("should return 500 when signature is invalid", async () => {
      mockProcessWebhookEvent.mockRejectedValue(
        new Error("Flow Webhook: Invalid signature"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/flow",
        {
          method: "POST",
          body: makeFormData({
            token: "test_token",
            status: "2",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(mockRecordWebhookEvent).not.toHaveBeenCalled();
    });
  });
});
