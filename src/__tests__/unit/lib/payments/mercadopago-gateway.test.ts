/**
 * Unit tests for MercadoPagoGateway (mapStatus and behavior).
 */

import { describe, expect, it, vi } from "vitest";

import { MercadoPagoGateway } from "@/lib/payments/mercadopago/gateway";

// ---------------------------------------------------------------------------
// T1: Mock MercadoPago SDK — vi.mock is hoisted before all imports
// ---------------------------------------------------------------------------
vi.stubEnv("MP_ACCESS_TOKEN", "test-access-token");
vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000");

// Shared ref so tests can set mockResolvedValue on SDK instance methods.
// The __mpMocks__ object is populated inside the vi.mock factory below.
vi.mock("mercadopago", () => {
  const mp = {
    mockPreference: { create: vi.fn() },
    mockPayment: { get: vi.fn(), create: vi.fn() },
    mockMerchantOrder: { get: vi.fn() },
    mockCustomer: { create: vi.fn(), search: vi.fn(), createCard: vi.fn() },
    mockPreApprovalPlan: { create: vi.fn() },
    mockPreApproval: { create: vi.fn(), get: vi.fn() },
  };

  (globalThis as unknown as Record<string, unknown>).__mpMocks__ = mp;

  function Config() {
    /* empty — holds no state */
  }
  function Pref() {
    return mp.mockPreference;
  }
  function Pay() {
    return mp.mockPayment;
  }
  function MO() {
    return mp.mockMerchantOrder;
  }
  function Cust() {
    return mp.mockCustomer;
  }
  function PAP() {
    return mp.mockPreApprovalPlan;
  }
  function PA() {
    return mp.mockPreApproval;
  }

  return {
    MercadoPagoConfig: Config,
    Preference: Pref,
    Payment: Pay,
    MerchantOrder: MO,
    Customer: Cust,
    PreApprovalPlan: PAP,
    PreApproval: PA,
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMocks(): any {
  return (globalThis as any).__mpMocks__;
}

describe("MercadoPagoGateway", () => {
  const gateway = new MercadoPagoGateway();

  describe("mapStatus", () => {
    it("should map pending status correctly", () => {
      expect(gateway.mapStatus("pending")).toBe("pending");
      expect(gateway.mapStatus("in_process")).toBe("pending");
    });

    it("should map approved status to succeeded", () => {
      expect(gateway.mapStatus("approved")).toBe("succeeded");
    });

    it("should map rejected status to failed", () => {
      expect(gateway.mapStatus("rejected")).toBe("failed");
      expect(gateway.mapStatus("cancelled")).toBe("failed");
    });

    it("should map refunded status correctly", () => {
      expect(gateway.mapStatus("refunded")).toBe("refunded");
    });

    it("should map unknown status to pending", () => {
      expect(gateway.mapStatus("unknown_status")).toBe("pending");
      expect(gateway.mapStatus("")).toBe("pending");
    });
  });

  // ---- T2: createPaymentIntent ----
  describe("createPaymentIntent", () => {
    it("should return correct shape when preference.create succeeds", async () => {
      getMocks().mockPreference.create.mockResolvedValue({
        body: {
          id: "pref_123",
          init_point: "https://www.mercadopago.cl/checkout?pref_id=pref_123",
        },
      });

      const result = await gateway.createPaymentIntent(
        "order_123",
        50000,
        "CLP",
        "user_123",
        "org_123",
      );

      expect(result).toEqual({
        preferenceId: "pref_123",
        approvalUrl: "https://www.mercadopago.cl/checkout?pref_id=pref_123",
        gatewayPaymentIntentId: "pref_123",
        status: "pending",
      });
    });

    it("should throw when preference.create SDK error occurs", async () => {
      getMocks().mockPreference.create.mockRejectedValue(
        new Error("Invalid access token"),
      );

      await expect(
        gateway.createPaymentIntent(
          "order_123",
          50000,
          "CLP",
          "user_123",
          "org_123",
        ),
      ).rejects.toThrow("Mercado Pago error: Invalid access token");
    });
  });

  // ---- T3: processWebhookEvent + getMerchantOrder ----
  describe("processWebhookEvent", () => {
    it("should process payment topic and return WebhookEvent with mapped status", async () => {
      getMocks().mockPayment.get.mockResolvedValue({
        body: {
          id: 12345,
          status: "approved",
          external_reference: "order_123",
          transaction_amount: 50000,
          currency_id: "CLP",
          metadata: { user_id: "user_123", organization_id: "org_123" },
          preference_id: "pref_123",
        },
      });

      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams({ topic: "payment", id: "123" }),
        },
      } as unknown as Request;

      const result = await gateway.processWebhookEvent(mockRequest as never);

      expect(result.gateway).toBe("mercadopago");
      expect(result.gatewayEventId).toBe("payment-123");
      expect(result.status).toBe("succeeded");
      expect(result.gatewayPaymentIntentId).toBe("pref_123");
      expect(result.amount).toBe(50000);
      expect(result.currency).toBe("CLP");
      expect(result.orderId).toBe("order_123");
    });

    it("should throw on merchant_order topic (not handled in processWebhookEvent)", async () => {
      const mockRequest = {
        nextUrl: {
          searchParams: new URLSearchParams({
            topic: "merchant_order",
            id: "456",
          }),
        },
      } as unknown as Request;

      await expect(
        gateway.processWebhookEvent(mockRequest as never),
      ).rejects.toThrow("Unhandled topic or missing ID");
    });

    it("should throw when topic is missing", async () => {
      const mockRequest = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as Request;

      await expect(
        gateway.processWebhookEvent(mockRequest as never),
      ).rejects.toThrow("Unhandled topic or missing ID");
    });
  });

  describe("getMerchantOrder", () => {
    it("should parse SDK response into MerchantOrderInfo", async () => {
      getMocks().mockMerchantOrder.get.mockResolvedValue({
        body: {
          preference_id: "pref_456",
          payments: [{ id: 999, status: "approved" }],
        },
      });

      const result = await gateway.getMerchantOrder("merchant_456");

      expect(result).toEqual({
        preference_id: "pref_456",
        payments: [{ id: 999, status: "approved" }],
      });
    });
  });

  // ---- T4: createPaymentWithToken + customer management ----
  describe("createPaymentWithToken", () => {
    it("should map successful payment response", async () => {
      getMocks().mockPayment.create.mockResolvedValue({
        body: {
          id: "pay_123",
          status: "approved",
          transaction_amount: 50000,
          currency_id: "CLP",
        },
      });

      const result = await gateway.createPaymentWithToken(
        "token_abc",
        50000,
        "CLP",
        "user_123",
        "org_123",
        "payer@test.com",
        "visa",
      );

      expect(result).toEqual({
        id: "pay_123",
        status: "succeeded",
        transaction_amount: 50000,
        currency_id: "CLP",
      });
    });

    it("should throw when paymentMethodId is empty", async () => {
      await expect(
        gateway.createPaymentWithToken(
          "token_abc",
          50000,
          "CLP",
          "user_123",
          "org_123",
          "payer@test.com",
          "",
        ),
      ).rejects.toThrow("Invalid payment_method_id");
    });
  });

  describe("Customer Management", () => {
    describe("createCustomer", () => {
      it("should return customer id from SDK response", async () => {
        getMocks().mockCustomer.create.mockResolvedValue({
          body: { id: "cus_123" },
        });

        const result = await gateway.createCustomer("test@example.com");
        expect(result).toBe("cus_123");
      });
    });

    describe("findCustomerByEmail", () => {
      it("should return null when search yields empty results", async () => {
        getMocks().mockCustomer.search.mockResolvedValue({ results: [] });

        const result = await gateway.findCustomerByEmail("unknown@example.com");
        expect(result).toBeNull();
      });

      it("should return customer id when found", async () => {
        getMocks().mockCustomer.search.mockResolvedValue({
          results: [{ id: "cus_123" }],
        });

        const result = await gateway.findCustomerByEmail("known@example.com");
        expect(result).toBe("cus_123");
      });
    });

    describe("addCardToCustomer", () => {
      it("should return card id from SDK response", async () => {
        getMocks().mockCustomer.createCard.mockResolvedValue({
          body: { id: "card_456" },
        });

        const result = await gateway.addCardToCustomer("cus_123", "token_xyz");
        expect(result).toBe("card_456");
      });
    });

    describe("createCustomerAndAddCard", () => {
      it("should orchestrate find -> create -> addCard when customer is new", async () => {
        // findCustomerByEmail returns null
        getMocks().mockCustomer.search.mockResolvedValue({ results: [] });
        // createCustomer succeeds
        getMocks().mockCustomer.create.mockResolvedValue({
          body: { id: "cus_new" },
        });
        // addCardToCustomer succeeds
        getMocks().mockCustomer.createCard.mockResolvedValue({
          body: { id: "card_new" },
        });

        const result = await gateway.createCustomerAndAddCard(
          "new@example.com",
          "token_new",
        );

        expect(result).toEqual({ customerId: "cus_new", cardId: "card_new" });
      });
    });
  });

  // ---- T5: PreApproval ----
  describe("PreApproval", () => {
    describe("createPreApprovalPlan", () => {
      it("should return plan id and init_point", async () => {
        getMocks().mockPreApprovalPlan.create.mockResolvedValue({
          body: {
            id: "plan_123",
            init_point: "https://www.mercadopago.cl/suscriptions?plan=plan_123",
          },
        });

        const result = await gateway.createPreApprovalPlan(
          "Plan Premium",
          19900,
          "CLP",
          "http://localhost:3000/checkout",
        );

        expect(result).toMatchObject({
          id: "plan_123",
          init_point: "https://www.mercadopago.cl/suscriptions?plan=plan_123",
        });
      });
    });

    describe("createPreApproval", () => {
      it("should return subscription id and authorized status", async () => {
        getMocks().mockPreApproval.create.mockResolvedValue({
          body: { id: "sub_123", status: "authorized" },
        });

        const result = await gateway.createPreApproval(
          "plan_123",
          "payer@test.com",
          "card_token",
          "Suscripcion Premium",
          "org_123",
          "http://localhost:3000/checkout",
        );

        expect(result).toMatchObject({
          id: "sub_123",
          status: "authorized",
        });
      });
    });

    describe("getPreApproval", () => {
      it("should return subscription with status and external_reference", async () => {
        getMocks().mockPreApproval.get.mockResolvedValue({
          body: {
            id: "sub_123",
            status: "authorized",
            external_reference: "org_456",
            payer_email: "payer@test.com",
            reason: "Premium Plan",
          },
        });

        const result = await gateway.getPreApproval("sub_123");

        expect(result).toMatchObject({
          id: "sub_123",
          status: "authorized",
          external_reference: "org_456",
        });
      });
    });
  });
});
