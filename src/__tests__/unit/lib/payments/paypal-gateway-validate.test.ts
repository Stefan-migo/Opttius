/**
 * Unit tests for PayPal webhook signature validation
 *
 * @module __tests__/unit/lib/payments/paypal-validate.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { PayPalGateway } from "@/lib/payments/paypal/gateway";

// Mock environment variables
vi.stubEnv("PAYPAL_CLIENT_ID", "test_client_id");
vi.stubEnv("PAYPAL_CLIENT_SECRET", "test_client_secret");
vi.stubEnv("PAYPAL_API_BASE_URL", "https://api-m.sandbox.paypal.com");

describe("PayPalGateway.validateWebhookSignature", () => {
  let gateway: PayPalGateway;

  const validHeaders = {
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.paypal.com/v1/notifications/certs/CERT-123",
    "paypal-transmission-id": "txn_id_123",
    "paypal-transmission-sig": "base64_signature==",
    "paypal-transmission-time": "2026-02-07T10:00:00Z",
  };
  const validBody = JSON.stringify({
    id: "test_event",
    event_type: "CHECKOUT.ORDER.COMPLETED",
  });

  beforeEach(() => {
    gateway = new PayPalGateway();
    vi.clearAllMocks();
    vi.stubEnv("PAYPAL_WEBHOOK_ID", "test_webhook_id");
    vi.stubEnv("PAYPAL_CLIENT_ID", "test_client_id");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "test_client_secret");
  });

  it("should return true for a valid signature", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "test_token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verification_status: "SUCCESS" }),
      });

    const result = await gateway.validateWebhookSignature(
      validHeaders,
      validBody,
    );

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const verifyCall = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[1];
    expect(verifyCall[0]).toContain(
      "/v1/notifications/verify-webhook-signature",
    );
  });

  it("should return false when verification_status is not SUCCESS", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "test_token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verification_status: "FAILURE" }),
      });

    const result = await gateway.validateWebhookSignature(
      validHeaders,
      validBody,
    );

    expect(result).toBe(false);
  });

  it("should return false and fail-closed on API error", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "test_token" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

    const result = await gateway.validateWebhookSignature(
      validHeaders,
      validBody,
    );

    expect(result).toBe(false);
  });

  it("should return false when PAYPAL_WEBHOOK_ID is missing", async () => {
    vi.stubEnv("PAYPAL_WEBHOOK_ID", "");

    const result = await gateway.validateWebhookSignature(
      validHeaders,
      validBody,
    );

    expect(result).toBe(false);
  });
});
