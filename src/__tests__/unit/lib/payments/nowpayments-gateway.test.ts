/**
 * Unit tests for NOWPayments gateway integration
 *
 * @module __tests__/unit/lib/payments/nowpayments-gateway.test
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NowPaymentsGateway } from "@/lib/payments/nowpayments/gateway";

// Mock environment variables
vi.stubEnv("NOWPAYMENTS_API_KEY", "test_api_key");
vi.stubEnv("NOWPAYMENTS_SANDBOX_API_KEY", "test_sandbox_api_key");
vi.stubEnv("NOWPAYMENTS_IPN_SECRET", "test_ipn_secret");
vi.stubEnv("NOWPAYMENTS_SANDBOX_MODE", "true");

describe("NowPaymentsGateway", () => {
  let gateway: NowPaymentsGateway;

  beforeEach(() => {
    gateway = new NowPaymentsGateway();
    vi.clearAllMocks();
  });

  describe("createPaymentIntent", () => {
    it("should create a payment invoice successfully", async () => {
      const mockResponse = {
        id: "invoice_123",
        invoice_url: "https://nowpayments.io/payment/invoice_123",
        order_id: "ORG-123-456",
        payment_status: "waiting",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await gateway.createPaymentIntent(
        "order_123",
        100,
        "USD",
        "user_123",
        "org_123",
      );

      expect(result).toEqual({
        invoiceUrl: mockResponse.invoice_url,
        gatewayPaymentIntentId: mockResponse.id,
        paymentId: mockResponse.id,
        status: "pending",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/invoice"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": "test_sandbox_api_key",
          }),
        }),
      );
    });

    it("should handle API errors gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({ message: "Invalid amount" }),
      });

      await expect(
        gateway.createPaymentIntent(
          "order_123",
          -10,
          "USD",
          "user_123",
          "org_123",
        ),
      ).rejects.toThrow("NOWPayments error");
    });
  });

  describe("processWebhookEvent", () => {
    it("should process a successful payment webhook", async () => {
      const webhookPayload = {
        payment_id: "payment_123",
        invoice_id: "invoice_123",
        payment_status: "finished",
        price_amount: 100,
        price_currency: "USD",
        pay_amount: 0.05,
        pay_currency: "BTC",
        order_id: "order_123",
        order_description: "Test payment",
      };

      // Calculate the correct signature
      const crypto = await import("crypto");
      const hmac = crypto.createHmac("sha512", "test_ipn_secret");
      hmac.update(JSON.stringify(webhookPayload));
      const correctSignature = hmac.digest("hex");

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/nowpayments",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: {
            "content-type": "application/json",
            "x-nowpayments-sig": correctSignature,
          },
        },
      );

      const result = await gateway.processWebhookEvent(request);

      expect(result).toMatchObject({
        gateway: "nowpayments",
        gatewayEventId: "payment_123",
        type: "payment.finished",
        status: "succeeded",
        amount: 100,
        currency: "USD",
        orderId: "order_123",
      });
    });

    it("should handle partially paid status", async () => {
      const webhookPayload = {
        payment_id: "payment_456",
        payment_status: "partially_paid",
        price_amount: 100,
        price_currency: "USD",
        order_id: "order_456",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/nowpayments",
        {
          method: "POST",
          body: JSON.stringify(webhookPayload),
          headers: {
            "content-type": "application/json",
          },
        },
      );

      const result = await gateway.processWebhookEvent(request);

      expect(result.status).toBe("pending");
      expect(result.type).toBe("payment.partially_paid");
    });
  });

  describe("mapStatus", () => {
    it("should map NOWPayments statuses correctly", () => {
      expect(gateway.mapStatus("waiting")).toBe("pending");
      expect(gateway.mapStatus("confirming")).toBe("pending");
      expect(gateway.mapStatus("finished")).toBe("succeeded");
      expect(gateway.mapStatus("confirmed")).toBe("succeeded");
      expect(gateway.mapStatus("failed")).toBe("failed");
      expect(gateway.mapStatus("expired")).toBe("failed");
      expect(gateway.mapStatus("partially_paid")).toBe("pending");
    });

    it("should default unknown statuses to pending", () => {
      expect(gateway.mapStatus("unknown_status")).toBe("pending");
    });
  });
});
