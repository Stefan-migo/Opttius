import { beforeEach, describe, expect, it, vi } from "vitest";

import { productTools } from "../products";
import { createMockBuilder, createMockSupabase, UUID, makeContext } from "./helpers";

// ponytail: vi.mock hoisting — use string literals, not imported constants
vi.mock("../resolvers", () => ({
  resolveBranchByName: vi.fn().mockResolvedValue("22222222-2222-2222-2222-222222222222"),
}));

describe("productTools", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  describe("getProducts", () => {
    const tool = productTools.find((t) => t.name === "getProducts")!;

    it("returns products with filters", async () => {
      const builder = createMockBuilder({
        data: [
          { id: UUID.PRODUCT, name: "Lente Pro", price: 150 },
          { id: UUID.OTHER_BRANCH, name: "Armazón Lux", price: 200 },
        ],
        error: null,
        count: 2,
      });
      mockSupabase.from.mockReturnValue(builder);

      const result = await tool.execute(
        { category: UUID.OTHER_BRANCH },
        makeContext({ supabase: mockSupabase, currency: "CLP" }),
      );

      expect(result.success).toBe(true);
      expect(result.data.products).toHaveLength(2);
      expect(builder.eq).toHaveBeenCalledWith("category_id", UUID.OTHER_BRANCH);
    });

    it("filters by search term", async () => {
      const builder = createMockBuilder({ data: [{ id: UUID.PRODUCT, name: "Lente Pro" }], error: null, count: 1 });
      mockSupabase.from.mockReturnValue(builder);

      await tool.execute({ search: "Lente" }, makeContext({ supabase: mockSupabase }));

      expect(builder.or).toHaveBeenCalled();
    });

    it("filters by price range", async () => {
      const builder = createMockBuilder({ data: [], error: null, count: 0 });
      mockSupabase.from.mockReturnValue(builder);

      await tool.execute({ minPrice: 100, maxPrice: 500 }, makeContext({ supabase: mockSupabase }));

      expect(builder.gte).toHaveBeenCalledWith("price", 100);
      expect(builder.lte).toHaveBeenCalledWith("price", 500);
    });

    it("fails without organizationId", async () => {
      const result = await tool.execute({}, makeContext({ supabase: mockSupabase, organizationId: null }));
      expect(result.success).toBe(false);
    });
  });

  describe("getProductById", () => {
    const tool = productTools.find((t) => t.name === "getProductById")!;

    it("returns product with relations", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({
          data: {
            id: UUID.PRODUCT,
            name: "Lente Pro",
            price: 150,
            categories: { id: UUID.OTHER_BRANCH, name: "Lentes", slug: "lentes" },
            product_variants: [],
            product_branch_stock: [],
          },
          error: null,
        }),
      );

      const result = await tool.execute(
        { productId: UUID.PRODUCT },
        makeContext({ supabase: mockSupabase, currency: "CLP" }),
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe("Lente Pro");
      expect(result.data.currency).toBe("CLP");
    });

    it("fails when not found", async () => {
      mockSupabase.from.mockReturnValue(createMockBuilder({ data: null, error: new Error("Not found") }));

      const result = await tool.execute({ productId: UUID.PRODUCT }, makeContext({ supabase: mockSupabase }));
      expect(result.success).toBe(false);
    });
  });

  describe("createProduct", () => {
    const tool = productTools.find((t) => t.name === "createProduct")!;

    it("creates a product with slug generation", async () => {
      mockSupabase.from
        .mockReturnValueOnce(createMockBuilder({ data: [], error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: { id: UUID.PRODUCT, name: "Nuevo Producto", slug: "nuevo-producto" }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: [{ id: UUID.BRANCH }], error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: null, error: null }));

      const result = await tool.execute(
        { name: "Nuevo Producto", price: 100 },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe("Nuevo Producto");
    });

    it("handles duplicate slug", async () => {
      mockSupabase.from
        .mockReturnValueOnce(createMockBuilder({ data: [{ id: "existing" }], error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: { id: UUID.PRODUCT, name: "Duplicado" }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: [{ id: UUID.BRANCH }], error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: null, error: null }));

      const result = await tool.execute(
        { name: "Duplicado", price: 50 },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
    });
  });

  describe("updateProduct", () => {
    const tool = productTools.find((t) => t.name === "updateProduct")!;

    it("updates product fields", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({ data: { id: UUID.PRODUCT, name: "Updated", price: 200 }, error: null }),
      );

      const result = await tool.execute(
        { productId: UUID.PRODUCT, updates: { name: "Updated", price: 200 } },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe("Updated");
    });

    it("strips inventory_quantity from updates", async () => {
      const builder = createMockBuilder({ data: { id: UUID.PRODUCT, name: "Clean" }, error: null });
      mockSupabase.from.mockReturnValue(builder);

      await tool.execute(
        { productId: UUID.PRODUCT, updates: { name: "Clean", inventory_quantity: 50 } },
        makeContext({ supabase: mockSupabase }),
      );

      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg).not.toHaveProperty("inventory_quantity");
      expect(updateArg.name).toBe("Clean");
    });
  });

  describe("deleteProduct", () => {
    const tool = productTools.find((t) => t.name === "deleteProduct")!;

    it("deletes a product", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({ data: { id: UUID.PRODUCT, name: "To Delete" }, error: null }),
      );

      const result = await tool.execute({ productId: UUID.PRODUCT }, makeContext({ supabase: mockSupabase }));
      expect(result.success).toBe(true);
    });

    it("fails when product not found", async () => {
      mockSupabase.from.mockReturnValue(createMockBuilder({ data: null, error: null }));

      const result = await tool.execute({ productId: UUID.PRODUCT }, makeContext({ supabase: mockSupabase }));
      expect(result.success).toBe(false);
    });
  });

  describe("updateInventory", () => {
    const tool = productTools.find((t) => t.name === "updateInventory")!;

    it("sets inventory quantity", async () => {
      mockSupabase.from
        .mockReturnValueOnce(createMockBuilder({ data: { id: UUID.PRODUCT, organization_id: UUID.ORG }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: { quantity: 10 }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: null, error: null }));

      const result = await tool.execute(
        { productId: UUID.PRODUCT, quantity: 25, adjustmentType: "set" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.quantity).toBe(25);
    });

    it("adds to current inventory", async () => {
      mockSupabase.from
        .mockReturnValueOnce(createMockBuilder({ data: { id: UUID.PRODUCT, organization_id: UUID.ORG }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: { quantity: 10 }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: null, error: null }));

      const result = await tool.execute(
        { productId: UUID.PRODUCT, quantity: 5, adjustmentType: "add" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.quantity).toBe(15);
    });

    it("subtracts from inventory (floor at 0)", async () => {
      mockSupabase.from
        .mockReturnValueOnce(createMockBuilder({ data: { id: UUID.PRODUCT, organization_id: UUID.ORG }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: { quantity: 3 }, error: null }))
        .mockReturnValueOnce(createMockBuilder({ data: null, error: null }));

      const result = await tool.execute(
        { productId: UUID.PRODUCT, quantity: 10, adjustmentType: "subtract" },
        makeContext({ supabase: mockSupabase }),
      );

      expect(result.success).toBe(true);
      expect(result.data.quantity).toBe(0);
    });
  });

  describe("getLowStockProducts", () => {
    const tool = productTools.find((t) => t.name === "getLowStockProducts")!;

    it("returns low stock products", async () => {
      mockSupabase.from.mockReturnValue(
        createMockBuilder({ data: [{ id: UUID.PRODUCT, name: "Low Item", inventory_quantity: 2, status: "active" }], error: null }),
      );

      const result = await tool.execute({ threshold: 5 }, makeContext({ supabase: mockSupabase }));

      expect(result.success).toBe(true);
      expect(result.data.products).toHaveLength(1);
      expect(result.data.threshold).toBe(5);
    });
  });
});
