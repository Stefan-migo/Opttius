/**
 * Unit tests for posService.
 *
 * Mocks ApiClient via globalThis-shared mock instance injected through
 * a plain constructor function.
 * isSuccess, isError and unwrapData are re-implemented inline as pure functions.
 * notificationService mock covers the top-level `success` import + dynamic `error` import.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock ApiClient — share mock client instance via globalThis
// ---------------------------------------------------------------------------
vi.mock("@/lib/api/client-helpers", () => {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  (globalThis as unknown as Record<string, unknown>).__aptMockClient__ = client;

  function isSuccess(r: Record<string, unknown>): boolean {
    return r?.success === true;
  }
  function isError(r: Record<string, unknown>): boolean {
    return r?.success === false;
  }
  function unwrapData<T>(response: Record<string, unknown>): T {
    if (isSuccess(response)) return response.data as T;
    const err = response?.error as Record<string, unknown> | undefined;
    const m = err?.message ?? "An unknown error occurred";
    throw new Error(m as string);
  }

  class MockApiClient {
    constructor() {
      return client;
    }
  }

  return { ApiClient: MockApiClient, isSuccess, isError, unwrapData };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const mockNotificationError = vi.hoisted(() => vi.fn());
const mockNotificationSuccess = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/services/notificationService", () => ({
  success: mockNotificationSuccess,
  error: mockNotificationError,
}));

vi.mock("@/lib/utils/branch", () => ({
  getBranchAndOperativoHeaders: vi.fn(() => ({
    "x-branch-id": "branch-001",
  })),
}));

function getMockClient() {
  return (globalThis as unknown as Record<string, unknown>)
    .__aptMockClient__ as Record<string, ReturnType<typeof vi.fn>>;
}

// Import AFTER mocks
import { posService } from "@/lib/api/services/posService";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const mockCashStatus = {
  isOpen: true,
  session_id: "sess-001",
  branch_id: "branch-001",
  opened_at: "2025-07-10T09:00:00Z",
  current_balance: 500000,
};

const mockPendingOrder = {
  id: "ord-001",
  order_number: "OC-001",
  customer_name: "Juan Pérez",
  total_amount: 178500,
  paid_amount: 50000,
  pending_amount: 128500,
  payment_status: "partial" as const,
  created_at: "2025-07-10T12:00:00Z",
};

const mockSaleResponse = {
  success: true,
  order: {
    id: "ord-002",
    order_number: "OC-002",
    total_amount: 150000,
    payment_status: "paid",
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("posService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCashStatus", () => {
    it("returns cash register status on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockCashStatus,
      });

      const result = await posService.getCashStatus("branch-001");

      expect(result).not.toBeNull();
      expect(result!.isOpen).toBe(true);
      expect(result!.current_balance).toBe(500000);
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/cash-register/open",
        expect.any(Object),
      );
    });

    it("returns null on API error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch status",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await posService.getCashStatus("branch-001");

      expect(result).toBeNull();
    });

    it("returns null on network error", async () => {
      getMockClient().get.mockRejectedValue(new Error("Network error"));

      const result = await posService.getCashStatus("branch-001");

      expect(result).toBeNull();
    });
  });

  describe("getPendingBalanceOrders", () => {
    it("returns pending balance orders", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: [mockPendingOrder],
      });

      const result = await posService.getPendingBalanceOrders(
        "Juan",
        "branch-001",
      );

      expect(result).toHaveLength(1);
      expect(result[0].pending_amount).toBe(128500);
    });

    it("returns empty array when data is not an array", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: { id: "ord-001" },
      });

      const result = await posService.getPendingBalanceOrders();

      expect(result).toEqual([]);
    });

    it("returns empty array on API error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await posService.getPendingBalanceOrders();

      expect(result).toEqual([]);
    });

    it("returns empty array on network error", async () => {
      getMockClient().get.mockRejectedValue(new Error("Network error"));

      const result = await posService.getPendingBalanceOrders();

      expect(result).toEqual([]);
    });

    it("passes search param when provided", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: [],
      });

      await posService.getPendingBalanceOrders("Pérez");

      const callUrl = getMockClient().get.mock.calls[0][0] as string;
      expect(callUrl).toContain("search=P%C3%A9rez");
    });

    it("uses default limit of 500", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: [],
      });

      await posService.getPendingBalanceOrders();

      const callUrl = getMockClient().get.mock.calls[0][0] as string;
      expect(callUrl).toContain("limit=500");
    });
  });

  describe("processPendingPayment", () => {
    const paymentRequest = {
      order_id: "ord-001",
      payment_amount: 128500,
      payment_method: "transfer",
    };

    it("processes payment and returns response", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: {
          success: true,
          payment: {
            id: "pay-001",
            amount: 128500,
            payment_method: "transfer",
          },
        },
      });

      const result = await posService.processPendingPayment(
        paymentRequest,
        "branch-001",
      );

      expect(result).not.toBeNull();
      expect(result!.payment!.amount).toBe(128500);
    });

    it("throws error on failed payment", async () => {
      getMockClient().post.mockResolvedValue({
        success: false,
        error: {
          code: "PAYMENT_ERROR",
          message: "Insufficient funds",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(
        posService.processPendingPayment(paymentRequest),
      ).rejects.toThrow("Insufficient funds");
    });
  });

  describe("processSale", () => {
    const saleRequest = {
      items: [
        {
          product_id: "prod-001",
          product_name: "Lentes Ópticos",
          quantity: 1,
          unit_price: 150000,
        },
      ],
      payment_method: "cash",
      subtotal: 150000,
      discount_amount: 0,
      tax_amount: 0,
      total: 150000,
      branch_id: "branch-001",
    };

    it("processes sale and returns response with notification", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockSaleResponse,
      });

      const result = await posService.processSale(saleRequest);

      expect(result).not.toBeNull();
      expect(result!.order!.order_number).toBe("OC-002");
      expect(mockNotificationSuccess).toHaveBeenCalledWith(
        expect.stringContaining("Venta procesada"),
      );
    });

    it("returns null on API error with toast for server error", async () => {
      mockNotificationError.mockClear();
      getMockClient().post.mockResolvedValue({
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Internal server error",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await posService.processSale(saleRequest);

      expect(result).toBeNull();
    });

    it("returns null on network error with warning toast", async () => {
      getMockClient().post.mockRejectedValue(new Error("Network error"));

      const result = await posService.processSale(saleRequest);

      expect(result).toBeNull();
    });
  });

  describe("processRefund", () => {
    const refundRequest = {
      order_id: "ord-001",
      items: [{ order_item_id: "oi-001", quantity: 1 }],
      reason: "Devolución voluntaria",
      refund_type: "partial" as const,
    };

    it("processes refund and returns result", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: { success: true, refund_amount: 150000, items_refunded: 1 },
      });

      const result = await posService.processRefund(refundRequest, "branch-001");

      expect(result).not.toBeNull();
      expect(result!.refund_amount).toBe(150000);
      expect(result!.items_refunded).toBe(1);
    });

    it("returns null on API error", async () => {
      getMockClient().post.mockResolvedValue({
        success: false,
        error: {
          code: "REFUND_ERROR",
          message: "Cannot refund processed order",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await posService.processRefund(refundRequest);

      expect(result).toBeNull();
    });

    it("returns null on network error", async () => {
      getMockClient().post.mockRejectedValue(new Error("Network error"));

      const result = await posService.processRefund(refundRequest);

      expect(result).toBeNull();
    });
  });

  describe("getBillingSettings", () => {
    it("returns billing settings on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: { settings: { tax_rate: 19, currency: "CLP" } },
      });

      const result = await posService.getBillingSettings("branch-001");

      expect(result).not.toBeNull();
      expect((result as Record<string, unknown>).tax_rate).toBe(19);
    });

    it("handles direct response format (without settings wrapper)", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: { tax_rate: 19, currency: "CLP" },
      });

      const result = await posService.getBillingSettings("branch-001");

      expect((result as Record<string, unknown>).tax_rate).toBe(19);
    });

    it("returns null on API error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Settings not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await posService.getBillingSettings();

      expect(result).toBeNull();
    });
  });

  describe("getCurrentOrganization", () => {
    it("returns organization data on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: {
          organization: {
            id: "org-001",
            name: "Óptica Central",
            rut: "76543210-8",
          },
        },
      });

      const result = await posService.getCurrentOrganization("branch-001");

      expect(result).not.toBeNull();
      expect((result as Record<string, unknown>).name).toBe("Óptica Central");
    });

    it("returns null when organization is not in response", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await posService.getCurrentOrganization("branch-001");

      expect(result).toBeNull();
    });

    it("returns null on API error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await posService.getCurrentOrganization();

      expect(result).toBeNull();
    });
  });
});
