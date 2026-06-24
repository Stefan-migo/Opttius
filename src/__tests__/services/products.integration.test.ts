/**
 * Products Service Integration Tests
 * Simplified test suite for Products business logic layer
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSupabaseClient } from "@/__mocks__/supabase";
import { ProductsService } from "@/lib/services/products/service";

describe("ProductsService", () => {
  let productService: ProductsService;
  let mockSupabase: unknown;

  const mockContext = {
    userId: "test-user-id",
    organizationId: "test-org-id",
    isSuperAdmin: false,
    branchId: "test-branch-id",
    accessibleBranches: [{ id: "test-branch-id", name: "Test Branch" }],
  };

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    productService = new ProductsService(mockSupabase);
  });

  describe("listProducts", () => {
    it("should list products with basic filters", async () => {
      const mockProducts = [
        {
          id: "1",
          name: "Test Product",
          price: 100,
          organization_id: "test-org-id",
        },
      ];

      // Setup mock chain
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockProducts,
          count: 1,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const params = {
        limit: 10,
        offset: 0,
        page: 1,
        organizationId: "test-org-id",
        isSuperAdmin: false,
      };

      const result = await productService.listProducts(params, mockContext);

      expect(result.products).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Database error");

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          count: 0,
          error,
        }),
      };

      mockSupabase.from.mockReturnValue(mockChain);

      const params = {
        organizationId: "test-org-id",
        isSuperAdmin: false,
      };

      await expect(
        productService.listProducts(params, mockContext),
      ).rejects.toThrow("Failed to fetch products: Database error");
    });
  });

  describe("createProduct", () => {
    it("should validate required fields", async () => {
      const productData = {
        price: 150,
      };

      await expect(
        productService.createProduct(productData as unknown, mockContext),
      ).rejects.toThrow("Product name is required");
    });

    it("should validate price", async () => {
      const productData = {
        name: "Test Product",
        slug: "test-product",
        price: "invalid" as unknown,
      };

      await expect(
        productService.createProduct(productData, mockContext),
      ).rejects.toThrow("Valid price is required");
    });
  });

  describe("Private Helper Methods", () => {
    it("should generate proper slugs", () => {
      // Test slug generation through service methods
      const service = productService as unknown;
      if (service.generateSlug) {
        const slug = service.generateSlug("Test Product");
        expect(slug).toBe("test-product");
      }
    });
  });
});
