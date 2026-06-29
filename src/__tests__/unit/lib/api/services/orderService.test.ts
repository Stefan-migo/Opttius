/**
 * Unit tests for orderService.
 *
 * Mocks ApiClient via globalThis-shared mock instance injected through
 * a plain constructor function.
 * isSuccess and unwrapData are re-implemented inline as pure functions.
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

  return { ApiClient: MockApiClient, isSuccess, unwrapData };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

function getMockClient() {
  return (globalThis as unknown as Record<string, unknown>)
    .__aptMockClient__ as Record<string, ReturnType<typeof vi.fn>>;
}

// Import AFTER mocks
import {
  orderService,
  getOrders,
  getOrder,
  createOrder,
  createManualOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  updatePaymentStatus,
  addOrderItem,
  updateOrderItem,
  removeOrderItem,
  processRefund,
} from "@/lib/api/services/orderService";

const mockOrder = {
  id: "ord-001",
  customer_id: "cust-001",
  customer_name: "Juan Pérez",
  customer_email: "juan@example.com",
  order_number: "OC-001",
  status: "pending" as const,
  payment_status: "pending" as const,
  subtotal: 150000,
  tax_amount: 28500,
  discount_amount: 0,
  total_amount: 178500,
  currency: "CLP",
  branch_id: "branch-001",
  created_at: "2025-07-10T12:00:00Z",
  updated_at: "2025-07-10T12:00:00Z",
};

const mockOrderList = [mockOrder];

const validCreateData = {
  customer_id: "cust-001",
  subtotal: 150000,
  tax_amount: 28500,
  discount_amount: 0,
  total_amount: 178500,
  branch_id: "branch-001",
};

const mockOrderItem = {
  id: "oi-001",
  order_id: "ord-001",
  product_name: "Lentes Ópticos",
  quantity: 1,
  unit_price: 150000,
  total_price: 150000,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("orderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrders", () => {
    it("returns paginated list on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockOrderList,
        meta: {
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await getOrders({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("ord-001");
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/orders"),
      );
    });

    it("falls back to default pagination when meta is missing", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockOrderList,
      });

      const result = await getOrders();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("throws on API error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Database connection failed",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(getOrders()).rejects.toThrow("Database connection failed");
    });

    it("builds query string from search params", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: [],
        meta: {
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await getOrders({ status: "pending", payment_status: "paid" });

      const callUrl = getMockClient().get.mock.calls[0][0] as string;
      expect(callUrl).toContain("status=pending");
      expect(callUrl).toContain("payment_status=paid");
    });
  });

  describe("getOrder", () => {
    it("returns a single order with items on success", async () => {
      const orderWithItems = { ...mockOrder, items: [mockOrderItem] };
      getMockClient().get.mockResolvedValue({
        success: true,
        data: orderWithItems,
      });

      const result = await getOrder("ord-001");

      expect(result.id).toBe("ord-001");
      expect(result.items).toHaveLength(1);
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/orders/ord-001",
      );
    });

    it("throws on not-found error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(getOrder("nonexistent")).rejects.toThrow("Order not found");
    });
  });

  describe("createOrder", () => {
    it("creates and returns the new order", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockOrder,
      });

      const result = await createOrder(validCreateData);

      expect(result.id).toBe("ord-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/orders",
        validCreateData,
      );
    });

    it("throws on creation failure", async () => {
      getMockClient().post.mockResolvedValue({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid order data",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(createOrder(validCreateData)).rejects.toThrow(
        "Invalid order data",
      );
    });
  });

  describe("createManualOrder", () => {
    it("creates and returns the manual order", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockOrder,
      });

      const result = await createManualOrder(validCreateData);

      expect(result.id).toBe("ord-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/orders/manual",
        validCreateData,
      );
    });
  });

  describe("updateOrder", () => {
    it("updates and returns the order", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockOrder, status: "processing" },
      });

      const result = await updateOrder("ord-001", { status: "processing" });

      expect(result.status).toBe("processing");
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/orders/ord-001",
        { status: "processing" },
      );
    });
  });

  describe("deleteOrder", () => {
    it("succeeds on successful delete", async () => {
      getMockClient().delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(deleteOrder("ord-001")).resolves.toBeUndefined();
      expect(getMockClient().delete).toHaveBeenCalledWith(
        "/api/admin/orders/ord-001",
      );
    });

    it("throws on delete failure", async () => {
      getMockClient().delete.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(deleteOrder("nonexistent")).rejects.toThrow(
        "Order not found",
      );
    });
  });

  describe("updateOrderStatus", () => {
    it("updates and returns the order with new status", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockOrder, status: "shipped" },
      });

      const result = await updateOrderStatus("ord-001", "shipped");

      expect(result.status).toBe("shipped");
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/orders/ord-001/status",
        { status: "shipped" },
      );
    });
  });

  describe("updatePaymentStatus", () => {
    it("updates payment status", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockOrder, payment_status: "paid" },
      });

      const result = await updatePaymentStatus("ord-001", "paid", "transfer");

      expect(result.payment_status).toBe("paid");
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/orders/ord-001/payment",
        { payment_status: "paid", payment_method: "transfer" },
      );
    });
  });

  describe("addOrderItem", () => {
    it("adds item and returns it", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockOrderItem,
      });

      const result = await addOrderItem("ord-001", {
        product_name: "Lentes Ópticos",
        quantity: 1,
        unit_price: 150000,
        total_price: 150000,
      });

      expect(result.id).toBe("oi-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/orders/ord-001/items",
        expect.any(Object),
      );
    });
  });

  describe("updateOrderItem", () => {
    it("updates and returns the item", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockOrderItem, quantity: 2, total_price: 300000 },
      });

      const result = await updateOrderItem("ord-001", "oi-001", {
        quantity: 2,
      });

      expect(result.quantity).toBe(2);
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/orders/ord-001/items/oi-001",
        { quantity: 2 },
      );
    });
  });

  describe("removeOrderItem", () => {
    it("removes item successfully", async () => {
      getMockClient().delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(
        removeOrderItem("ord-001", "oi-001"),
      ).resolves.toBeUndefined();
      expect(getMockClient().delete).toHaveBeenCalledWith(
        "/api/admin/orders/ord-001/items/oi-001",
      );
    });
  });

  describe("processRefund", () => {
    it("processes refund and returns updated order", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: { ...mockOrder, payment_status: "refunded" },
      });

      const result = await processRefund("ord-001", 178500, "Cliente devolvió");

      expect(result.payment_status).toBe("refunded");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/orders/ord-001/refund",
        { amount: 178500, reason: "Cliente devolvió" },
      );
    });

    it("processes refund without reason", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: { ...mockOrder, payment_status: "refunded" },
      });

      const result = await processRefund("ord-001", 50000);

      expect(result.payment_status).toBe("refunded");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/orders/ord-001/refund",
        { amount: 50000, reason: undefined },
      );
    });
  });

  describe("service object", () => {
    it("exposes all methods on orderService", () => {
      expect(orderService.getOrders).toBe(getOrders);
      expect(orderService.getOrder).toBe(getOrder);
      expect(orderService.createOrder).toBe(createOrder);
      expect(orderService.createManualOrder).toBe(createManualOrder);
      expect(orderService.updateOrder).toBe(updateOrder);
      expect(orderService.deleteOrder).toBe(deleteOrder);
      expect(orderService.updateOrderStatus).toBe(updateOrderStatus);
      expect(orderService.updatePaymentStatus).toBe(updatePaymentStatus);
      expect(orderService.addOrderItem).toBe(addOrderItem);
      expect(orderService.updateOrderItem).toBe(updateOrderItem);
      expect(orderService.removeOrderItem).toBe(removeOrderItem);
      expect(orderService.processRefund).toBe(processRefund);
    });
  });
});
