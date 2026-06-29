/**
 * Unit tests for productService.
 *
 * Mocks ApiClient via globalThis-shared mock instance injected through
 * a plain constructor function.
 * isSuccess and unwrapData are re-implemented inline as pure functions.
 * exportProducts and importProductsFile use raw fetch — mocked via vi.stubGlobal.
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
import {
  productService,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  updateProductStock,
  bulkProductOperations,
} from "@/lib/api/services/productService";

const mockProduct = {
  id: "prod-001",
  name: "Lentes Ópticos Premium",
  slug: "lentes-opticos-premium",
  price: 150000,
  cost_price: 80000,
  product_type: "frame" as const,
  sku: "FRM-001",
  brand: "Ray-Ban",
  status: "active",
  created_at: "2025-07-10T12:00:00Z",
  updated_at: "2025-07-10T12:00:00Z",
};

const mockProductList = [mockProduct];

const validCreateData = {
  name: "Lentes Ópticos Premium",
  price: 150000,
  product_type: "frame" as const,
  sku: "FRM-001",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("productService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProducts", () => {
    it("returns paginated list on success", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockProductList,
        meta: {
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      const result = await getProducts({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("prod-001");
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/products"),
      );
    });

    it("falls back to default pagination when meta is missing", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockProductList,
      });

      const result = await getProducts();

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

      await expect(getProducts()).rejects.toThrow("Database connection failed");
    });
  });

  describe("getProduct", () => {
    it("returns a product from success response", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      const result = await getProduct("prod-001");

      expect(result.id).toBe("prod-001");
      expect(result.name).toBe("Lentes Ópticos Premium");
    });

    it("handles response with product wrapper", async () => {
      getMockClient().get.mockResolvedValue({
        product: mockProduct,
      });

      const result = await getProduct("prod-001");

      expect(result.id).toBe("prod-001");
    });

    it("throws on error response via extractProductFromResponse", async () => {
      // extractProductFromResponse rejects error responses that
      // don't have success:true or a product wrapper
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Product not found",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(getProduct("nonexistent")).rejects.toThrow(
        "Invalid response format",
      );
    });

    it("passes x-branch-id header when branchId is provided", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      await getProduct("prod-001", "branch-001");

      const callOptions = getMockClient().get.mock.calls[0][1] as Record<string, unknown>;
      expect(callOptions.headers).toEqual({ "x-branch-id": "branch-001" });
    });
  });

  describe("createProduct", () => {
    it("creates and returns the product", async () => {
      getMockClient().post.mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      const result = await createProduct(validCreateData);

      expect(result.id).toBe("prod-001");
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/products",
        validCreateData,
      );
    });

    it("handles product-wrapper response format", async () => {
      getMockClient().post.mockResolvedValue({
        product: mockProduct,
      });

      const result = await createProduct(validCreateData);

      expect(result.id).toBe("prod-001");
    });
  });

  describe("updateProduct", () => {
    it("updates and returns the product", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockProduct, price: 160000 },
      });

      const result = await updateProduct("prod-001", { price: 160000 });

      expect(result.price).toBe(160000);
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/products/prod-001",
        { price: 160000 },
        {},
      );
    });

    it("passes x-branch-id header when branchId is provided", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      await updateProduct("prod-001", { price: 160000 }, "branch-001");

      const callOptions = getMockClient().put.mock.calls[0][2] as Record<string, unknown>;
      expect(callOptions.headers).toEqual({ "x-branch-id": "branch-001" });
    });
  });

  describe("deleteProduct", () => {
    it("succeeds on successful delete", async () => {
      getMockClient().delete.mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(deleteProduct("prod-001")).resolves.toBeUndefined();
      expect(getMockClient().delete).toHaveBeenCalledWith(
        "/api/admin/products/prod-001",
      );
    });

    it("throws on error response", async () => {
      getMockClient().delete.mockResolvedValue({
        error: { message: "Failed to delete product" },
      });

      await expect(deleteProduct("prod-001")).rejects.toThrow(
        "Failed to delete product",
      );
    });
  });

  describe("searchProducts", () => {
    it("returns products matching query", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: mockProductList,
      });

      const result = await searchProducts("Lentes");

      expect(result).toHaveLength(1);
      expect(result[0].name).toContain("Lentes");
      expect(getMockClient().get).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/products/search"),
        expect.any(Object),
      );
    });

    it("returns empty array when data is not an array", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: { id: "prod-001" },
      });

      const result = await searchProducts("Lentes");

      expect(result).toEqual([]);
    });

    it("includes type param when provided", async () => {
      getMockClient().get.mockResolvedValue({
        success: true,
        data: [],
      });

      await searchProducts("Lentes", "branch-001", "lens");

      const callUrl = getMockClient().get.mock.calls[0][0] as string;
      expect(callUrl).toContain("type=lens");
    });

    it("throws on API error", async () => {
      getMockClient().get.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Search failed",
          timestamp: "2025-07-10T12:00:00Z",
        },
      });

      await expect(searchProducts("error")).rejects.toThrow("Search failed");
    });
  });

  describe("updateProductStock", () => {
    it("updates stock and returns the product", async () => {
      getMockClient().put.mockResolvedValue({
        success: true,
        data: { ...mockProduct, stock_quantity: 15 },
      });

      const result = await updateProductStock("prod-001", 15, "branch-001");

      expect((result as Record<string, unknown>).stock_quantity).toBe(15);
      expect(getMockClient().put).toHaveBeenCalledWith(
        "/api/admin/products/prod-001/stock",
        { quantity: 15, branch_id: "branch-001" },
      );
    });
  });

  describe("bulkProductOperations", () => {
    it("returns bulk operation results", async () => {
      const bulkData = {
        operation: "delete",
        product_ids: ["prod-001", "prod-002"],
      };
      getMockClient().post.mockResolvedValue({
        success: true,
        data: { success: ["prod-001"], failed: [{ id: "prod-002", error: "Not found" }] },
      });

      const result = await bulkProductOperations(bulkData);

      expect(result.success).toEqual(["prod-001"]);
      expect(result.failed).toHaveLength(1);
      expect(getMockClient().post).toHaveBeenCalledWith(
        "/api/admin/products/bulk",
        bulkData,
      );
    });
  });

  describe("service object", () => {
    it("exposes methods on productService", () => {
      expect(productService.getProducts).toBe(getProducts);
      expect(productService.getProduct).toBe(getProduct);
      expect(productService.createProduct).toBe(createProduct);
      expect(productService.updateProduct).toBe(updateProduct);
      expect(productService.deleteProduct).toBe(deleteProduct);
      expect(productService.searchProducts).toBe(searchProducts);
      expect(productService.updateProductStock).toBe(updateProductStock);
    });
  });
});
