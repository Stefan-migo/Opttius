/**
 * Unit tests for PayPal gateway integration
 *
 * @module __tests__/unit/lib/payments/paypal-gateway.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PayPalGateway } from "@/lib/payments/paypal/gateway";

// Mock environment variables
vi.stubEnv("PAYPAL_CLIENT_ID", "test_client_id");
vi.stubEnv("PAYPAL_CLIENT_SECRET", "test_client_secret");
vi.stubEnv("PAYPAL_API_BASE_URL", "https://api-m.sandbox.paypal.com");

describe("PayPalGateway", () => {
  let gateway: PayPalGateway;

  beforeEach(() => {
    gateway = new PayPalGateway();
    vi.clearAllMocks();
  });

  describe("mapStatus", () => {
    it("should map pending status correctly", () => {
      expect(gateway.mapStatus("CREATED")).toBe("pending");
      expect(gateway.mapStatus("PAYER_ACTION_REQUIRED")).toBe("pending");
    });

    it("should map approved status correctly", () => {
      expect(gateway.mapStatus("APPROVED")).toBe("succeeded");
      expect(gateway.mapStatus("COMPLETED")).toBe("succeeded");
    });

    it("should map rejected status correctly", () => {
      expect(gateway.mapStatus("DECLINED")).toBe("failed");
      expect(gateway.mapStatus("FAILED")).toBe("failed");
      expect(gateway.mapStatus("CANCELLED")).toBe("failed");
      expect(gateway.mapStatus("REFUNDED")).toBe("refunded");
    });

    it("should map unknown status to pending", () => {
      expect(gateway.mapStatus("UNKNOWN_STATUS")).toBe("pending");
    });
  });

  describe("createPaymentIntent", () => {
    it("should create a payment intent successfully", async () => {
      // Mock access token response
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: "test_access_token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "test_order_id",
            links: [
              {
                href: "https://www.sandbox.paypal.com/checkout/test_order_id",
                rel: "payer-action",
              },
            ],
          }),
        });

      const result = await gateway.createPaymentIntent(
        "order_123",
        100,
        "USD",
        "user_123",
        "org_123",
      );

      expect(result).toEqual({
        paymentId: "test_order_id",
        approvalUrl: "https://www.sandbox.paypal.com/checkout/test_order_id",
        status: "pending",
        clientSecret: "test_order_id",
        gateway: "paypal",
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should handle access token errors", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error_description: "Invalid credentials" }),
      });

      await expect(
        gateway.createPaymentIntent(
          "order_123",
          100,
          "USD",
          "user_123",
          "org_123",
        ),
      ).rejects.toThrow("Failed to get PayPal Access Token");
    });

    it("should handle order creation errors", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: "test_access_token" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ message: "Invalid amount" }),
        });

      await expect(
        gateway.createPaymentIntent(
          "order_123",
          100,
          "USD",
          "user_123",
          "org_123",
        ),
      ).rejects.toThrow("PayPal Order Creation Failed");
    });

    it("should throw error when PayPal credentials are missing", async () => {
      // Clear environment variables
      vi.stubEnv("PAYPAL_CLIENT_ID", "");
      vi.stubEnv("PAYPAL_CLIENT_SECRET", "");

      const freshGateway = new PayPalGateway();

      await expect(
        freshGateway.createPaymentIntent(
          "order_123",
          100,
          "USD",
          "user_123",
          "org_123",
        ),
      ).rejects.toThrow(
        "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set",
      );
    });
  });

  describe("processWebhookEvent", () => {
    it("should process a successful payment webhook", async () => {
      const webhookData = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "test_capture_id",
          status: "COMPLETED",
          purchase_units: [
            {
              reference_id: "order_123",
              amount: {
                value: "100.00",
                currency_code: "USD",
              },
            },
          ],
        },
      };

      const mockRequest = {
        json: vi.fn().mockResolvedValue(webhookData),
      } as any;

      const result = await gateway.processWebhookEvent(mockRequest);

      expect(result).toEqual({
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
        metadata: webhookData,
      });
    });

    it("should process a failed payment webhook", async () => {
      const webhookData = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.DECLINED",
        resource: {
          id: "test_capture_id",
          status: "DECLINED",
          purchase_units: [
            {
              reference_id: "order_123",
              amount: {
                value: "100.00",
                currency_code: "USD",
              },
            },
          ],
        },
      };

      const mockRequest = {
        json: vi.fn().mockResolvedValue(webhookData),
      } as any;

      const result = await gateway.processWebhookEvent(mockRequest);

      expect(result.status).toBe("failed");
      expect(result.type).toBe("PAYMENT.CAPTURE.DECLINED");
    });

    it("should process refund events", async () => {
      const webhookData = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.REFUNDED",
        resource: {
          id: "test_refund_id",
          status: "REFUNDED",
          purchase_units: [
            {
              reference_id: "order_123",
              amount: {
                value: "50.00",
                currency_code: "USD",
              },
            },
          ],
        },
      };

      const mockRequest = {
        json: vi.fn().mockResolvedValue(webhookData),
      } as any;

      const result = await gateway.processWebhookEvent(mockRequest);

      expect(result.status).toBe("refunded");
      expect(result.type).toBe("PAYMENT.CAPTURE.REFUNDED");
    });

    it("should handle missing resource data", async () => {
      const webhookData = {
        id: "test_event_id",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: null,
      };

      const mockRequest = {
        json: vi.fn().mockResolvedValue(webhookData),
      } as any;

      await expect(gateway.processWebhookEvent(mockRequest)).rejects.toThrow(
        "PayPal Webhook: Unhandled event type or missing data",
      );
    });
  });

  // Note: PayPal gateway currently doesn't implement validateWebhookSignature
  // This would need to be added for production use according to PayPal documentation
  describe.skip("validateWebhookSignature", () => {
    // Placeholder for future implementation
    // PayPal webhook signature verification should be added for production
    // (PAYPAL_WEBHOOK_ID and certificate validation). See PayPal docs.
    it.todo("should validate webhook signature correctly");
    it.todo("should reject invalid signatures");
  });
});
