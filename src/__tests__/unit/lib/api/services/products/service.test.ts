/**
 * Unit tests for ProductsService (Supabase-based service).
 *
 * ProductsService takes a SupabaseClient via constructor and uses it
 * directly (not via ApiClient). Mock the Supabase query chain: all
 * builder methods return the chain for chaining, the chain itself is
 * thenable (for direct `await` in listProducts & ensureUniqueSlug),
 * and .single() returns a separate promise.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProductsService } from "@/lib/api/services/products/service";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// Mock logger — pino is brittle in test, swap for no-ops
// ---------------------------------------------------------------------------
vi.mock("@/lib/logger", () => ({
  appLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock Supabase chain factory
//
// ProductsService uses two terminal patterns:
//   (a) await query                  → destructures { data, error, count }
//   (b) await query.single()         → destructures { data, error }
//
// The chain is made thenable (via .then) for (a), while .single() returns
// a resolved promise for (b). Both read from a shared state object that
// each test sets up before calling the service method.
// ---------------------------------------------------------------------------
function createMockSupabase() {
  const state = {
    thenValue: { data: null, error: null, count: 0 },
    singleValue: { data: null, error: null },
  };

  const chain = {
    // Thenable — direct await resolves to state.thenValue
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(state.thenValue).then(resolve),

    // Builder methods — all return the chain for fluent chaining
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    contains: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    limit: vi.fn(() => chain),

    // Terminal for single-row operations
    single: vi.fn(() => Promise.resolve(state.singleValue)),
  };

  return {
    supabase: { from: vi.fn(() => chain) },
    chain,
    state,
  };
}

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const defaultContext = {
  userId: "user-001",
  organizationId: "org-001",
  isSuperAdmin: false,
  branchId: "branch-001",
  accessibleBranches: [{ id: "branch-001", name: "Sucursal Principal" }],
};

const superAdminContext = {
  ...defaultContext,
  isSuperAdmin: true,
};

const baseProduct = {
  id: "prod-001",
  name: "Lente Óptico Premium",
  slug: "lente-optico-premium",
  price: 150000,
  cost_price: 80000,
  product_type: "frame" as const,
  sku: "FRM-001",
  brand: "Ray-Ban",
  status: "active",
  category_id: "cat-001",
  organization_id: "org-001",
  branch_id: null,
  description: "Lente de alta calidad",
  image_url: null,
  featured: false,
  created_at: "2025-07-10T12:00:00Z",
  updated_at: "2025-07-10T12:00:00Z",
  categories: { id: "cat-001", name: "Lentes", slug: "lentes" },
  product_variants: [],
  product_branch_stock: null,
};

// ---------------------------------------------------------------------------
// ProductsService
// ---------------------------------------------------------------------------
describe("ProductsService", () => {
  let mock: ReturnType<typeof createMockSupabase>;
  let service: ProductsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createMockSupabase();
    service = new ProductsService(mock.supabase as unknown as never);
  });

  // -----------------------------------------------------------------------
  // listProducts
  // -----------------------------------------------------------------------
  describe("listProducts", () => {
    it("returns paginated list with default pagination", async () => {
      mock.state.thenValue = { data: [baseProduct], error: null, count: 1 };

      const result = await service.listProducts({}, defaultContext);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].id).toBe("prod-001");
      expect(result.totalCount).toBe(1);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPrevPage).toBe(false);
      expect(mock.supabase.from).toHaveBeenCalledWith("products");
      expect(mock.chain.select).toHaveBeenCalled();
      // default limit=12, offset=0 → range(0, 11)
      expect(mock.chain.range).toHaveBeenCalledWith(0, 11);
    });

    it("applies organization_id filter for non-super-admin", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.listProducts(
        { organizationId: "org-001" },
        defaultContext,
      );

      expect(mock.chain.eq).toHaveBeenCalledWith(
        "organization_id",
        "org-001",
      );
    });

    it("skips organization filter for super admin", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.listProducts(
        { isSuperAdmin: true },
        superAdminContext,
      );

      // org filter should NOT be applied for super admin
      const eqCalls = mock.chain.eq.mock.calls.filter(
        (c: string[]) => c[0] === "organization_id",
      );
      expect(eqCalls).toHaveLength(0);
    });

    it("applies branch .or() filter for super admin with branchId", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.listProducts(
        { branchId: "branch-001", isSuperAdmin: true, organizationId: "org-001" },
        superAdminContext,
      );

      expect(mock.chain.or).toHaveBeenCalledWith(
        expect.stringContaining("branch_id.eq.branch-001"),
      );
    });

    it("applies category filter", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.listProducts({ category: "cat-001" }, defaultContext);

      expect(mock.chain.eq).toHaveBeenCalledWith("category_id", "cat-001");
    });

    it("applies price range filters", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.listProducts(
        { minPrice: "10000", maxPrice: "50000" },
        defaultContext,
      );

      expect(mock.chain.gte).toHaveBeenCalledWith("price", 10000);
      expect(mock.chain.lte).toHaveBeenCalledWith("price", 50000);
    });

    it("excludes archived status by default", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.listProducts({}, defaultContext);

      expect(mock.chain.neq).toHaveBeenCalledWith("status", "archived");
    });

    it("applies status filter when provided", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.listProducts({ status: "draft" }, defaultContext);

      expect(mock.chain.eq).toHaveBeenCalledWith("status", "draft");
    });

    it("handles search with ilike across name, description, and sku", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.listProducts({ search: "Premium" }, defaultContext);

      expect(mock.chain.or).toHaveBeenCalledWith(
        expect.stringContaining("ilike"),
      );
      expect(mock.chain.or).toHaveBeenCalledWith(
        expect.stringContaining("Premium"),
      );
    });

    it("applies custom sort order", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.listProducts(
        { sortBy: "price", sortOrder: "asc" },
        defaultContext,
      );

      expect(mock.chain.order).toHaveBeenCalledWith("price", {
        ascending: true,
      });
    });

    it("falls back to created_at for invalid sort column", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.listProducts(
        { sortBy: "invalid_column" },
        defaultContext,
      );

      expect(mock.chain.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("applies low stock post-processing filter", async () => {
      const lowStockProduct = {
        ...baseProduct,
        id: "prod-low",
        branch_id: "branch-001",
        product_branch_stock: [
          {
            quantity: 3,
            reserved_quantity: 0,
            low_stock_threshold: 10,
            branch_id: "branch-001",
          },
        ],
      };
      const normalProduct = {
        ...baseProduct,
        id: "prod-normal",
        branch_id: "branch-001",
        product_branch_stock: [
          {
            quantity: 50,
            reserved_quantity: 0,
            low_stock_threshold: 10,
            branch_id: "branch-001",
          },
        ],
      };

      mock.state.thenValue = {
        data: [lowStockProduct, normalProduct],
        error: null,
        count: 2,
      };

      const result = await service.listProducts(
        { lowStockOnly: true, branchId: "branch-001", page: 1, limit: 20 },
        defaultContext,
      );

      expect(result.products).toHaveLength(1);
      expect(result.products[0].id).toBe("prod-low");
    });

    it("applies in-stock post-processing filter", async () => {
      const inStockProduct = {
        ...baseProduct,
        id: "prod-in",
        branch_id: "branch-001",
        product_branch_stock: [
          {
            quantity: 10,
            reserved_quantity: 0,
            low_stock_threshold: 5,
            branch_id: "branch-001",
          },
        ],
      };
      const outOfStockProduct = {
        ...baseProduct,
        id: "prod-out",
        branch_id: "branch-001",
        product_branch_stock: [
          {
            quantity: 0,
            reserved_quantity: 0,
            low_stock_threshold: 5,
            branch_id: "branch-001",
          },
        ],
      };

      mock.state.thenValue = {
        data: [inStockProduct, outOfStockProduct],
        error: null,
        count: 2,
      };

      const result = await service.listProducts(
        { inStock: "true", branchId: "branch-001" },
        defaultContext,
      );

      expect(result.products).toHaveLength(1);
      expect(result.products[0].id).toBe("prod-in");
    });

    it("computes pagination fields correctly", async () => {
      const manyProducts = Array.from({ length: 25 }, (_, i) => ({
        ...baseProduct,
        id: `prod-${String(i + 1).padStart(3, "0")}`,
        name: `Product ${i + 1}`,
      }));
      // totalCount = 25, limit = 12 → totalPages = 3
      mock.state.thenValue = {
        data: manyProducts,
        error: null,
        count: 25,
      };

      const result = await service.listProducts(
        { page: 2, limit: 12 },
        defaultContext,
      );

      expect(result.totalCount).toBe(25);
      expect(result.currentPage).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPrevPage).toBe(true);
    });

    it("throws on database error", async () => {
      mock.state.thenValue = {
        data: null,
        error: { message: "Connection timed out", code: "PGRST301" },
        count: 0,
      };

      await expect(
        service.listProducts({}, defaultContext),
      ).rejects.toThrow("Failed to fetch products");
    });
  });

  // -----------------------------------------------------------------------
  // getProductById
  // -----------------------------------------------------------------------
  describe("getProductById", () => {
    it("returns product with relations", async () => {
      mock.state.singleValue = { data: baseProduct, error: null };

      const result = await service.getProductById("prod-001", defaultContext);

      expect(result.id).toBe("prod-001");
      expect(result.name).toBe("Lente Óptico Premium");
      expect(mock.chain.eq).toHaveBeenCalledWith("id", "prod-001");
      expect(mock.chain.single).toHaveBeenCalledTimes(1);
    });

    it("applies organization_id filter for non-super-admin", async () => {
      mock.state.singleValue = { data: baseProduct, error: null };

      await service.getProductById("prod-001", defaultContext);

      expect(mock.chain.eq).toHaveBeenCalledWith(
        "organization_id",
        "org-001",
      );
    });

    it("skips organization_id filter for super admin", async () => {
      mock.state.singleValue = { data: baseProduct, error: null };

      await service.getProductById("prod-001", {
        ...defaultContext,
        isSuperAdmin: true,
      });

      const orgFilterCalls = mock.chain.eq.mock.calls.filter(
        (c: string[]) => c[0] === "organization_id",
      );
      expect(orgFilterCalls).toHaveLength(0);
    });

    it("throws NotFoundError on PGRST116 (record not found)", async () => {
      mock.state.singleValue = {
        data: null,
        error: { code: "PGRST116", message: "Not found", details: "" },
      };

      await expect(
        service.getProductById("prod-001", defaultContext),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws generic Error on other database error", async () => {
      mock.state.singleValue = {
        data: null,
        error: { code: "PGRST500", message: "Internal error", details: "" },
      };

      await expect(
        service.getProductById("prod-001", defaultContext),
      ).rejects.toThrow("Failed to fetch product");
    });

    it("throws NotFoundError when product is null without error", async () => {
      mock.state.singleValue = { data: null, error: null };

      await expect(
        service.getProductById("prod-001", defaultContext),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // -----------------------------------------------------------------------
  // createProduct
  // -----------------------------------------------------------------------
  describe("createProduct", () => {
    const validInput = {
      name: "Lente Óptico Premium",
      price: 150000,
      product_type: "frame" as const,
    };

    it("creates and returns a product", async () => {
      // ensureUniqueSlug: slug is unique on first try
      mock.state.thenValue = { data: [], error: null, count: 0 };
      mock.state.singleValue = { data: baseProduct, error: null };

      const result = await service.createProduct(validInput, defaultContext);

      expect(result.id).toBe("prod-001");
      expect(mock.chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Lente Óptico Premium" }),
      );
      expect(mock.chain.single).toHaveBeenCalledTimes(1);
    });

    it("throws ValidationError when name is empty or missing", async () => {
      await expect(
        service.createProduct(
          { name: "", price: 100, product_type: "frame" },
          defaultContext,
        ),
      ).rejects.toThrow(ValidationError);

      await expect(
        service.createProduct(
          { name: "   ", price: 100, product_type: "frame" },
          defaultContext,
        ),
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when price is invalid", async () => {
      await expect(
        service.createProduct(
          { name: "Test", price: undefined as unknown as number, product_type: "frame" },
          defaultContext,
        ),
      ).rejects.toThrow(ValidationError);

      await expect(
        service.createProduct(
          { name: "Test", price: NaN, product_type: "frame" },
          defaultContext,
        ),
      ).rejects.toThrow(ValidationError);
    });

    it("sets organization_id from context", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };
      mock.state.singleValue = { data: baseProduct, error: null };

      await service.createProduct(validInput, defaultContext);

      const insertArg = mock.chain.insert.mock.calls[0][0] as Record<string, unknown>;
      expect(insertArg.organization_id).toBe("org-001");
    });

    it("generates slug from name when not provided", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };
      mock.state.singleValue = { data: baseProduct, error: null };

      await service.createProduct(validInput, defaultContext);

      const insertArg = mock.chain.insert.mock.calls[0][0] as Record<string, unknown>;
      // generateSlug("Lente Óptico Premium") → "lente-optico-premium"
      expect(insertArg.slug).toBe("lente-optico-premium");
    });

    it("uses provided slug when given", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };
      mock.state.singleValue = { data: baseProduct, error: null };

      await service.createProduct(
        { ...validInput, slug: "custom-slug" },
        defaultContext,
      );

      const insertArg = mock.chain.insert.mock.calls[0][0] as Record<string, unknown>;
      expect(insertArg.slug).toBe("custom-slug");
    });

    it("throws Error on database failure", async () => {
      mock.state.thenValue = { data: [], error: null, count: 0 };
      mock.state.singleValue = {
        data: null,
        error: { message: "insert error", code: "23505", details: "" },
      };

      await expect(
        service.createProduct(validInput, defaultContext),
      ).rejects.toThrow("Failed to create product");
    });
  });

  // -----------------------------------------------------------------------
  // updateProduct
  // -----------------------------------------------------------------------
  describe("updateProduct", () => {
    it("updates and returns the modified product", async () => {
      const existing = { ...baseProduct, price: 150000 };
      const updated = { ...baseProduct, price: 160000 };

      mock.chain.single
        .mockResolvedValueOnce({ data: existing, error: null })
        .mockResolvedValueOnce({ data: updated, error: null });

      const result = await service.updateProduct(
        "prod-001",
        { price: 160000 },
        defaultContext,
      );

      expect(result.price).toBe(160000);
      expect(mock.chain.update).toHaveBeenCalledWith({ price: 160000 });
      expect(mock.chain.single).toHaveBeenCalledTimes(2);
    });

    it("generates new slug when name changes", async () => {
      const existing = { ...baseProduct, name: "Old Name", slug: "old-name" };
      const updated = { ...existing, name: "New Name", slug: "new-name" };

      mock.chain.single
        .mockResolvedValueOnce({ data: existing, error: null })
        .mockResolvedValueOnce({ data: updated, error: null });
      mock.state.thenValue = { data: [], error: null, count: 0 };

      await service.updateProduct("prod-001", { name: "New Name" }, defaultContext);

      const updateArg = mock.chain.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateArg.slug).toBe("new-name");
    });

    it("does not regenerate slug when name stays the same", async () => {
      mock.chain.single
        .mockResolvedValueOnce({ data: baseProduct, error: null })
        .mockResolvedValueOnce({ data: baseProduct, error: null });

      await service.updateProduct(
        "prod-001",
        { price: 160000 },
        defaultContext,
      );

      const updateArg = mock.chain.update.mock.calls[0][0] as Record<string, unknown>;
      // slug should NOT be in the update payload when name hasn't changed
      expect(updateArg).not.toHaveProperty("slug");
    });

    it("throws NotFoundError when product does not exist", async () => {
      mock.state.singleValue = {
        data: null,
        error: { code: "PGRST116", message: "not found", details: "" },
      };

      await expect(
        service.updateProduct("nonexistent", { name: "Test" }, defaultContext),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws Error on database update failure", async () => {
      mock.chain.single
        .mockResolvedValueOnce({ data: baseProduct, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "update conflict", code: "23505", details: "" },
        });

      await expect(
        service.updateProduct("prod-001", { name: "Test" }, defaultContext),
      ).rejects.toThrow("Failed to update product");
    });
  });

  // -----------------------------------------------------------------------
  // deleteProduct
  // -----------------------------------------------------------------------
  describe("deleteProduct", () => {
    it("deletes product successfully", async () => {
      mock.state.singleValue = { data: baseProduct, error: null };
      mock.state.thenValue = { data: null, error: null, count: 0 };

      await service.deleteProduct("prod-001", defaultContext);

      expect(mock.chain.delete).toHaveBeenCalled();
      expect(mock.chain.eq).toHaveBeenCalledWith("id", "prod-001");
    });

    it("throws NotFoundError when product does not exist", async () => {
      mock.state.singleValue = {
        data: null,
        error: { code: "PGRST116", message: "not found", details: "" },
      };

      await expect(
        service.deleteProduct("nonexistent", defaultContext),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws Error on database delete failure", async () => {
      mock.state.singleValue = { data: baseProduct, error: null };
      mock.state.thenValue = {
        data: null,
        error: { message: "foreign key violation", code: "23503" },
        count: 0,
      };

      await expect(
        service.deleteProduct("prod-001", defaultContext),
      ).rejects.toThrow("Failed to delete product");
    });
  });
});
