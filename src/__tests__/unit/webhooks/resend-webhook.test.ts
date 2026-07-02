/**
 * Unit tests for Resend webhook Svix signature verification
 *
 * @module __tests__/unit/webhooks/resend-webhook.test
 */

import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockWebhookImpl } = vi.hoisted(() => ({
  // regular function, not arrow — needed because route calls `new Webhook(secret)`
  mockWebhookImpl: vi.fn(function () {
    return { verify: vi.fn() };
  }),
}));

// Mock svix before any imports
vi.mock("svix", () => ({
  Webhook: mockWebhookImpl,
}));

// Mock supabase webhook client
vi.mock("@/utils/supabase/webhook", () => ({
  createWebhookClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  appLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import { Webhook } from "svix";

import { POST } from "@/app/api/webhooks/resend/route";

function createResendRequest(
  body: object,
  svixHeaders?: Record<string, string>,
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...svixHeaders,
  };
  return new Request("http://localhost:3000/api/webhooks/resend", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("Resend Webhook - Svix Signature Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "test_secret");
    // Default: Webhook returns an instance with working verify
    mockWebhookImpl.mockImplementation(function () {
      return { verify: vi.fn() };
    });
  });

  describe("valid signature", () => {
    it("should return 200 and process event when Svix signature is valid", async () => {
      const request = createResendRequest(
        {
          type: "email.delivered",
          data: { email_id: "test_123", to: ["user@test.com"] },
        },
        {
          "svix-signature": "v1,valid_signature",
          "svix-id": "msg_test123",
          "svix-timestamp": "1700000000",
        },
      );

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ received: true });
    });
  });

  describe("missing signature header", () => {
    it("should return 401 when svix-signature header is missing", async () => {
      const request = createResendRequest(
        {
          type: "email.delivered",
          data: { email_id: "test_123" },
        },
        {
          "svix-id": "msg_test123",
          "svix-timestamp": "1700000000",
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should return 401 when all Svix headers are missing", async () => {
      const request = createResendRequest({
        type: "email.delivered",
        data: { email_id: "test_123" },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe("invalid signature", () => {
    it("should return 401 when Svix verify throws", async () => {
      mockWebhookImpl.mockImplementation(function () {
        return {
          verify: vi.fn(function () {
            throw new Error("Invalid signature");
          }),
        };
      });

      const request = createResendRequest(
        {
          type: "email.delivered",
          data: { email_id: "test_123" },
        },
        {
          "svix-signature": "v1,bad_signature",
          "svix-id": "msg_test123",
          "svix-timestamp": "1700000000",
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe("missing secret in development", () => {
    it("should warn and process when RESEND_WEBHOOK_SECRET is not set in development", async () => {
      vi.stubEnv("RESEND_WEBHOOK_SECRET", "");

      const request = createResendRequest(
        {
          type: "email.delivered",
          data: { email_id: "test_123", to: ["user@test.com"] },
        },
        {
          "svix-signature": "v1,some_sig",
          "svix-id": "msg_test123",
          "svix-timestamp": "1700000000",
        },
      );

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual({ received: true });
    });

    it("should process event without calling Svix when secret is missing in dev", async () => {
      vi.stubEnv("RESEND_WEBHOOK_SECRET", "");

      const request = createResendRequest(
        {
          type: "email.delivered",
          data: { email_id: "test_123", to: ["user@test.com"] },
        },
        {
          "svix-signature": "v1,sig",
          "svix-id": "msg_id",
          "svix-timestamp": "1700000000",
        },
      );

      await POST(request);

      expect(Webhook).not.toHaveBeenCalled();
    });
  });

  describe("unrelated event type", () => {
    it("should return 200 for non-allowed events (verification still happens)", async () => {
      const request = createResendRequest(
        { type: "email.not_a_real_event", data: {} },
        {
          "svix-signature": "v1,sig",
          "svix-id": "msg_id",
          "svix-timestamp": "1700000000",
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(Webhook).toHaveBeenCalledTimes(1);
    });
  });
});
