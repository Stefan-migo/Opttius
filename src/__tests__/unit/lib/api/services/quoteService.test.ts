/**
 * Unit tests for quoteService.
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
  quoteService,
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  sendQuote,
  acceptQuote,
  rejectQuote,
  convertQuoteToOrder,
  addQuoteItem,
  updateQuoteItem,
  removeQuoteItem,
} from "@/lib/api/services/quoteService";

const mockQuote = {
  id: "qte-001",
  quote_number: "COT-001",
  customer_id: "cust-001",
  customer_name: "Juan Pérez",
  customer_email: "juan@example.com",
  status: "draft" as const,
  subtotal: 150000,
  tax_amount: 28500,
  discount_amount: 0,
  total_amount: 178500,
  currency: "CLP",
  branch_id: "branch-001",
  created_at: "2025-07-10T12:00:00Z",
};

const mockQuoteList = [mockQuote];

const validCreateData = {
  customer_id: "cust-001",
  subtotal: 150000,
  tax_amount: 28500,
  discount_amount: 0,
  total_amount: 178500,
  branch_id: "branch-001",
};

const mockQuoteItem = {
  id: "qi-001",
  quote_id: "qte-001",
  product_name: "Lentes Ópticos",
  quantity: 1,
  unit_price: 150000,
  total_price: 150000,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("quoteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getQuotes", () => {
    it("returns paginated list on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockQuoteList,
        meta: {
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await getQuotes({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("qte-001");
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/quotes"),
      );
    });

    it("falls back to default pagination when meta is missing", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockQuoteList,
      });

      const result = await getQuotes();

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

      await expect(getQuotes()).rejects.toThrow("Database connection failed");
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

      await getQuotes({ status: "draft", customer_id: "cust-001" });

      const callUrl = getMockClient().get.mock.calls[0][0] as string;
      expect(callUrl).toContain("status=draft");
      expect(callUrl).toContain("customer_id=cust-001");
    });
  });

  describe("getQuote", () => {
    it("returns a single quote with items on success", async () => {
      const quoteWithItems = { ...mockQuote, items: [mockQuoteItem] };
      getMockClient().get.mockResolvedValue({
        success: true,
        data: quoteWithItems,
      });

      const result = await getQuote("qte-001");

      expect(result.id).toBe("qte-001");
      expect(result.items).toHaveLength(1);
      expect(getMockClient().get).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001",
      );
    });

    it("throws on not-found error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Quote not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(getQuote("nonexistent")).rejects.toThrow("Quote not found");
    });
  });

  describe("createQuote", () => {
    it("creates and returns the new quote", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockQuote,
      });

      const result = await createQuote(validCreateData);

      expect(result.id).toBe("qte-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/quotes",
        validCreateData,
      );
    });

    it("throws on creation failure", async () => {
      getMockClient().post.mockResolvedValue({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid quote data",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(createQuote(validCreateData)).rejects.toThrow(
        "Invalid quote data",
      );
    });
  });

  describe("updateQuote", () => {
    it("updates and returns the quote", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockQuote, status: "sent" },
      });

      const result = await updateQuote("qte-001", { status: "sent" });

      expect(result.status).toBe("sent");
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001",
        { status: "sent" },
      );
    });
  });

  describe("deleteQuote", () => {
    it("succeeds on successful delete", async () => {
      getMockClient().delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(deleteQuote("qte-001")).resolves.toBeUndefined();
      expect(getMockClient().delete).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001",
      );
    });

    it("throws on delete failure", async () => {
      getMockClient().delete.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Quote not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(deleteQuote("nonexistent")).rejects.toThrow(
        "Quote not found",
      );
    });
  });

  describe("sendQuote", () => {
    it("sends quote without email", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: { ...mockQuote, status: "sent" },
      });

      const result = await sendQuote("qte-001");

      expect(result.status).toBe("sent");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001/send",
        {},
      );
    });

    it("sends quote with specific email", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: { ...mockQuote, status: "sent" },
      });

      await sendQuote("qte-001", "cliente@example.com");

      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001/send",
        { email: "cliente@example.com" },
      );
    });
  });

  describe("acceptQuote", () => {
    it("accepts and returns the quote", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockQuote, status: "accepted" },
      });

      const result = await acceptQuote("qte-001");

      expect(result.status).toBe("accepted");
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001",
        { status: "accepted" },
      );
    });
  });

  describe("rejectQuote", () => {
    it("rejects and returns the quote", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockQuote, status: "rejected" },
      });

      const result = await rejectQuote("qte-001");

      expect(result.status).toBe("rejected");
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001",
        { status: "rejected" },
      );
    });
  });

  describe("convertQuoteToOrder", () => {
    it("converts quote to order and returns order_id", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: { order_id: "ord-001" },
      });

      const result = await convertQuoteToOrder("qte-001");

      expect(result.order_id).toBe("ord-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001/convert",
        {},
      );
    });
  });

  describe("addQuoteItem", () => {
    it("adds item and returns it", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockQuoteItem,
      });

      const result = await addQuoteItem("qte-001", {
        product_name: "Lentes Ópticos",
        quantity: 1,
        unit_price: 150000,
        total_price: 150000,
      });

      expect(result.id).toBe("qi-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001/items",
        expect.any(Object),
      );
    });
  });

  describe("updateQuoteItem", () => {
    it("updates and returns the item", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockQuoteItem, quantity: 2, total_price: 300000 },
      });

      const result = await updateQuoteItem("qte-001", "qi-001", {
        quantity: 2,
      });

      expect(result.quantity).toBe(2);
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001/items/qi-001",
        { quantity: 2 },
      );
    });
  });

  describe("removeQuoteItem", () => {
    it("removes item successfully", async () => {
      getMockClient().delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(
        removeQuoteItem("qte-001", "qi-001"),
      ).resolves.toBeUndefined();
      expect(getMockClient().delete).toHaveBeenCalledWith(
        "/api/admin/quotes/qte-001/items/qi-001",
      );
    });
  });

  describe("service object", () => {
    it("exposes all methods on quoteService", () => {
      expect(quoteService.getQuotes).toBe(getQuotes);
      expect(quoteService.getQuote).toBe(getQuote);
      expect(quoteService.createQuote).toBe(createQuote);
      expect(quoteService.updateQuote).toBe(updateQuote);
      expect(quoteService.deleteQuote).toBe(deleteQuote);
      expect(quoteService.sendQuote).toBe(sendQuote);
      expect(quoteService.acceptQuote).toBe(acceptQuote);
      expect(quoteService.rejectQuote).toBe(rejectQuote);
      expect(quoteService.convertQuoteToOrder).toBe(convertQuoteToOrder);
      expect(quoteService.addQuoteItem).toBe(addQuoteItem);
      expect(quoteService.updateQuoteItem).toBe(updateQuoteItem);
      expect(quoteService.removeQuoteItem).toBe(removeQuoteItem);
    });
  });
});
