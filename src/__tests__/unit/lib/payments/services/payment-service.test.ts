/**
 * Unit tests for PaymentService.
 *
 * PaymentService wraps Supabase queries for payments, webhook events,
 * order fulfillment, and organization subscription updates.
 *
 * Mock strategy: create a shared chain object whose .single() and
 * .maybeSingle() return what each test sets via mockResolvedValueOnce,
 * and whose .then() resolves from a mutable _directResult (for
 * insert/update calls without .single()).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Payment, WebhookEvent } from "@/types/payment";

// ---------------------------------------------------------------------------
// Mocks — hoisted before imports
// ---------------------------------------------------------------------------
vi.mock("@/lib/email/notifications", () => ({
  sendSaaSNotification: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/saas/tier-change-audit", () => ({
  recordTierChange: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/logger", () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { PaymentService } from "@/lib/payments/services/payment-service";
import { sendSaaSNotification } from "@/lib/email/notifications";
import { recordTierChange } from "@/lib/saas/tier-change-audit";

// ---------------------------------------------------------------------------
// Supabase mock — shared chain that sets _directResult for .then() and
// delegates .single() / .maybeSingle() to vitest mock for sequence control.
// ---------------------------------------------------------------------------
function createMockSupabase() {
  const chain: Record<string, unknown> = {
    _directResult: { data: null, error: null },
  };

  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chain.then = vi.fn((onfulfilled: (v: unknown) => unknown) =>
    Promise.resolve(chain._directResult).then(onfulfilled),
  );

  const supabase = { from: vi.fn(() => chain) } as ReturnType<typeof vi.fn>;

  return { supabase: supabase as unknown as ReturnType<typeof Object>, chain: chain as Record<string, ReturnType<typeof vi.fn>> };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockPayment: Payment = {
  id: "pay-001",
  order_id: "ord-001",
  organization_id: "org-001",
  user_id: "user-001",
  amount: 29900,
  currency: "CLP",
  status: "pending",
  gateway: "mercadopago",
  gateway_transaction_id: null,
  gateway_payment_intent_id: "pi-001",
  created_at: "2025-07-01T12:00:00Z",
  updated_at: "2025-07-01T12:00:00Z",
};

const mockWebhookEvent: WebhookEvent = {
  gateway: "mercadopago",
  gatewayEventId: "evt-001",
  type: "payment",
  status: "succeeded",
  gatewayTransactionId: "tx-001",
  gatewayPaymentIntentId: "pi-001",
  amount: 29900,
  currency: "CLP",
  orderId: "ord-001",
  organizationId: "org-001",
};

const createAttrs = {
  order_id: "ord-001",
  organization_id: "org-001",
  user_id: "user-001",
  amount: 29900,
  currency: "CLP",
  status: "pending" as const,
  gateway: "mercadopago" as const,
  payment_method: null,
  gateway_transaction_id: null,
  gateway_payment_intent_id: null,
  gateway_charge_id: null,
  metadata: null,
};

describe("PaymentService", () => {
  let service: PaymentService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chain: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    chain = mock.chain;
    service = new PaymentService(mock.supabase);
  });

  // -----------------------------------------------------------------------
  // createPayment
  // -----------------------------------------------------------------------
  describe("createPayment", () => {
    it("creates a payment and returns it", async () => {
      chain.single.mockResolvedValueOnce({ data: mockPayment, error: null });

      const result = await service.createPayment(createAttrs as Parameters<typeof service.createPayment>[0]);

      expect(result.id).toBe("pay-001");
      expect(result.status).toBe("pending");
      expect(chain.insert).toHaveBeenCalledWith(createAttrs);
      expect(chain.select).toHaveBeenCalled();
      expect(chain.single).toHaveBeenCalled();
    });

    it("throws on DB error", async () => {
      chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "relation payments does not exist" },
      });

      await expect(
        service.createPayment(createAttrs as Parameters<typeof service.createPayment>[0]),
      ).rejects.toThrow("Error creating payment");
    });

    it("throws when returned payment is null", async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.createPayment(createAttrs as Parameters<typeof service.createPayment>[0]),
      ).rejects.toThrow("Payment creation returned null");
    });
  });

  // -----------------------------------------------------------------------
  // updatePaymentStatus
  // -----------------------------------------------------------------------
  describe("updatePaymentStatus", () => {
    it("updates status and returns the updated payment", async () => {
      const updated = { ...mockPayment, status: "succeeded" as const };
      chain.single.mockResolvedValueOnce({ data: updated, error: null });

      const result = await service.updatePaymentStatus("pay-001", "succeeded", "tx-999", { foo: "bar" }, "pi-999");

      expect(result.status).toBe("succeeded");
      expect(chain.update).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith("id", "pay-001");
    });

    it("throws on DB error", async () => {
      chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "permission denied" },
      });

      await expect(
        service.updatePaymentStatus("pay-001", "failed"),
      ).rejects.toThrow("Error updating payment status");
    });

    it("throws when updated payment is null", async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.updatePaymentStatus("pay-001", "refunded"),
      ).rejects.toThrow("Payment update returned null");
    });
  });

  // -----------------------------------------------------------------------
  // getPaymentById
  // -----------------------------------------------------------------------
  describe("getPaymentById", () => {
    it("returns a payment when found", async () => {
      chain.single.mockResolvedValueOnce({ data: mockPayment, error: null });

      const result = await service.getPaymentById("pay-001");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("pay-001");
    });

    it("returns null for PGRST116 (no rows)", async () => {
      chain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });

      const result = await service.getPaymentById("pay-999");

      expect(result).toBeNull();
    });

    it("throws on other error codes", async () => {
      chain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST500", message: "internal" },
      });

      await expect(service.getPaymentById("pay-001")).rejects.toThrow(
        "Error fetching payment",
      );
    });
  });

  // -----------------------------------------------------------------------
  // getPaymentByGatewayPaymentIntentId
  // -----------------------------------------------------------------------
  describe("getPaymentByGatewayPaymentIntentId", () => {
    it("returns a payment when found", async () => {
      chain.single.mockResolvedValueOnce({ data: mockPayment, error: null });

      const result = await service.getPaymentByGatewayPaymentIntentId("pi-001");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("pay-001");
      expect(chain.eq).toHaveBeenCalledWith("gateway_payment_intent_id", "pi-001");
    });

    it("returns null on PGRST116", async () => {
      chain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });

      const result = await service.getPaymentByGatewayPaymentIntentId("pi-999");

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // updatePaymentFromWebhook
  // -----------------------------------------------------------------------
  describe("updatePaymentFromWebhook", () => {
    it("returns early when webhook event has no payment intent ID", async () => {
      const noIntent: WebhookEvent = {
        ...mockWebhookEvent,
        gatewayPaymentIntentId: undefined,
      };

      // The early return happens before any supabase.from() call
      // Create a fresh supabase mock to verify
      const freshMock = createMockSupabase();
      const freshService = new PaymentService(freshMock.supabase);

      await freshService.updatePaymentFromWebhook(noIntent);

      expect(freshMock.supabase.from).not.toHaveBeenCalled();
    });

    it("returns early when webhook event was already processed", async () => {
      // recordWebhookEvent finds existing processed event
      chain.single.mockResolvedValueOnce({
        data: { id: "we-001", processed: true },
        error: null,
      });

      await service.updatePaymentFromWebhook(mockWebhookEvent);

      // Should not have queried payments
      const fromCalls = chain.single.mock.calls.length;
      // Only 1 call for webhook_events select
      expect(fromCalls).toBe(1);
    });

    it("processes a new webhook event: payment succeeded, order fulfilled, org updated", async () => {
      // Sequence of .single() calls across the full flow:
      // 1. recordWebhookEvent → webhook_events select (no existing)
      chain.single.mockResolvedValueOnce({ data: null, error: null });
      // 2. getPaymentByGatewayPaymentIntentId → payments select
      chain.single.mockResolvedValueOnce({ data: mockPayment, error: null });
      // 3. updatePaymentStatus → payments update
      chain.single.mockResolvedValueOnce({
        data: { ...mockPayment, status: "succeeded" },
        error: null,
      });
      // 4. fulfillOrder → orders update
      chain.single.mockResolvedValueOnce({
        data: { id: "ord-001", status: "completed" },
        error: null,
      });
      // 5. applyPaymentSuccessToOrganization → org select (subscription_tier)
      chain.single.mockResolvedValueOnce({
        data: { subscription_tier: "basic" },
        error: null,
      });
      // 6. applyPaymentSuccessToOrganization → org select (email)
      chain.single.mockResolvedValueOnce({
        data: { name: "Test Org", owner_id: "user-001" },
        error: null,
      });
      // 7. applyPaymentSuccessToOrganization → profiles select (owner)
      chain.single.mockResolvedValueOnce({
        data: { email: "admin@test.com", first_name: "Admin" },
        error: null,
      });

      // .maybeSingle() for subscriptions select
      chain.maybeSingle.mockResolvedValueOnce({
        data: { id: "sub-001", status: "trial" },
        error: null,
      });

      // _directResult is used for insert/update calls without .single()
      // subscription_tiers query, webhook_events insert, org update,
      // subscriptions update, webhook_events markProcessed — all succeed
      chain._directResult = { data: null, error: null };

      await service.updatePaymentFromWebhook(mockWebhookEvent);

      // Order fulfilled
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "completed" }),
      );

      // Organization tier updated
      expect(recordTierChange).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-001",
          toTier: "basic",
        }),
      );

      // Email notification sent
      expect(sendSaaSNotification).toHaveBeenCalledWith(
        "saas_subscription_success",
        "admin@test.com",
        expect.objectContaining({ plan_name: "BASIC" }),
      );
    });

    it("handles payment not found gracefully", async () => {
      // recordWebhookEvent: no existing event
      chain.single.mockResolvedValueOnce({ data: null, error: null });
      // getPaymentByGatewayPaymentIntentId: no payment found
      chain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });

      chain._directResult = { data: null, error: null };

      await service.updatePaymentFromWebhook(mockWebhookEvent);

      // Should not have called payment update or order fulfillment
      expect(recordTierChange).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // fulfillOrder
  // -----------------------------------------------------------------------
  describe("fulfillOrder", () => {
    it("marks order as completed", async () => {
      chain.single.mockResolvedValueOnce({
        data: { id: "ord-001", status: "completed" },
        error: null,
      });

      await service.fulfillOrder("ord-001");

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "completed" }),
      );
      expect(chain.eq).toHaveBeenCalledWith("id", "ord-001");
    });

    it("throws on DB error", async () => {
      chain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "orders table not found" },
      });

      await expect(service.fulfillOrder("ord-001")).rejects.toThrow(
        "Error fulfilling order",
      );
    });

    it("handles order not found gracefully", async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: null });

      // Should not throw
      await expect(service.fulfillOrder("ord-999")).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // applyPaymentSuccessToOrganization
  // -----------------------------------------------------------------------
  describe("applyPaymentSuccessToOrganization", () => {
    const succeededPayment: Payment = {
      ...mockPayment,
      status: "succeeded",
      gateway_transaction_id: "tx-001",
    };

    it("updates org tier from metadata, converts trial subscription, sends email", async () => {
      // 1. org select (subscription_tier)
      chain.single.mockResolvedValueOnce({
        data: { subscription_tier: "basic" },
        error: null,
      });
      // 2. org select (email info)
      chain.single.mockResolvedValueOnce({
        data: { name: "Opttius Test", owner_id: "owner-001" },
        error: null,
      });
      // 3. profiles select
      chain.single.mockResolvedValueOnce({
        data: { email: "owner@test.com", first_name: "Owner" },
        error: null,
      });

      // maybeSingle: existing subscription
      chain.maybeSingle.mockResolvedValueOnce({
        data: { id: "sub-001", status: "trial" },
        error: null,
      });

      // Tier query and direct awaits
      chain._directResult = { data: null, error: null };

      // Payment has metadata with subscription_tier
      const paymentWithMeta: Payment = {
        ...succeededPayment,
        metadata: { subscription_tier: "pro" } as Record<string, unknown>,
      };

      await service.applyPaymentSuccessToOrganization(
        "org-001",
        paymentWithMeta,
        "pi-001",
        "tx-001",
      );

      // Org updated to pro
      expect(recordTierChange).toHaveBeenCalledWith(
        expect.objectContaining({ toTier: "pro" }),
      );

      // Email sent
      expect(sendSaaSNotification).toHaveBeenCalledWith(
        "saas_subscription_success",
        "owner@test.com",
        expect.objectContaining({ plan_name: "PRO" }),
      );

      // Subscription updated (not created)
      const lastUpdateCall = chain.update.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === "object" &&
          c[0] !== null &&
          "status" in (c[0] as Record<string, unknown>),
      );
      expect(lastUpdateCall).toBeDefined();
    });

    it("creates new subscription when none exists", async () => {
      // 1. org select (subscription_tier)
      chain.single.mockResolvedValueOnce({
        data: { subscription_tier: "basic" },
        error: null,
      });
      // 2. org select (email) — no owner_id to keep test simple
      chain.single.mockResolvedValueOnce({
        data: { name: "Opttius Test", owner_id: null },
        error: null,
      });

      // maybeSingle: no existing subscription
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      chain._directResult = { data: null, error: null };

      await service.applyPaymentSuccessToOrganization(
        "org-001",
        succeededPayment,
        "pi-001",
        "tx-001",
      );

      // Tier changed
      expect(recordTierChange).toHaveBeenCalled();
      // No email (no owner)
      expect(sendSaaSNotification).not.toHaveBeenCalled();
    });

    it("handles email failure gracefully (non-blocking)", async () => {
      const sendMock = vi.mocked(sendSaaSNotification);
      sendMock.mockRejectedValueOnce(new Error("SMTP down"));

      // 1. org select (subscription_tier)
      chain.single.mockResolvedValueOnce({
        data: { subscription_tier: "basic" },
        error: null,
      });
      // 2. org select (email)
      chain.single.mockResolvedValueOnce({
        data: { name: "Test", owner_id: "owner-001" },
        error: null,
      });
      // 3. profiles select
      chain.single.mockResolvedValueOnce({
        data: { email: "o@test.com", first_name: "O" },
        error: null,
      });

      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      chain._directResult = { data: null, error: null };

      // Should not throw despite email failure
      await expect(
        service.applyPaymentSuccessToOrganization(
          "org-001",
          succeededPayment,
          "pi-001",
          "tx-001",
        ),
      ).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // updateSubscriptionPaymentMethod
  // -----------------------------------------------------------------------
  describe("updateSubscriptionPaymentMethod", () => {
    it("updates payment method on existing subscription", async () => {
      chain.maybeSingle.mockResolvedValueOnce({
        data: { id: "sub-001" },
        error: null,
      });

      chain._directResult = { data: null, error: null };

      await service.updateSubscriptionPaymentMethod(
        "org-001",
        "cus-001",
        "pm-001",
      );

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          gateway_customer_id: "cus-001",
          gateway_payment_method_id: "pm-001",
        }),
      );
    });

    it("does nothing when no subscription exists", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await service.updateSubscriptionPaymentMethod(
        "org-999",
        "cus-999",
        "pm-999",
      );

      expect(chain.update).not.toHaveBeenCalled();
    });

    it("throws on DB error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({
        data: { id: "sub-001" },
        error: null,
      });

      chain._directResult = { data: null, error: { message: "DB error" } };
      // When update is awaited and errors, it destructures { error }
      // The then handler returns _directResult which has error set
      chain.then.mockImplementationOnce(
        (onfulfilled: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: "DB error" } }).then(onfulfilled),
      );

      await expect(
        service.updateSubscriptionPaymentMethod("org-001", "cus-001", "pm-001"),
      ).rejects.toThrow("Error updating subscription payment method");
    });
  });
});
