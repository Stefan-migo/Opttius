/**
 * Unit tests for import-service.ts (mocked Supabase).
 *
 * Follows the mock pattern from root-middleware.test.ts:
 * vi.mock("@/utils/supabase/service-role") + chain builder for from/select/insert/etc.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateUniqueSlug,
  processProducts,
  resolveCategoryId,
} from "@/lib/inventory/import-service";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import type { ImportProduct } from "@/lib/inventory/import-service";

// Mock dependencies
vi.mock("@/utils/supabase/service-role");
vi.mock("@/lib/logger", () => ({
  appLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Helpers ───────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<ImportProduct> = {}): ImportProduct {
  return {
    name: "Test Product",
    slug: "test-product",
    price: 19900,
    stock_quantity: 10,
    status: "active",
    ...overrides,
  };
}

/**
 * Create a mock Supabase chain builder.
 * Each call to the returned mock returns itself (for chaining),
 * so individual terminal methods can be overridden per test.
 */
function createMockChain() {
  const mockChain = {
    // Terminal methods (each test overrides as needed)
    single: vi.fn(),
    maybeSingle: vi.fn(),
    rpc: vi.fn(),

    // Chained methods (return mockChain for .from().select().eq().... pattern)
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
  };

  // Wire the builder chain
  mockChain.select.mockReturnValue(mockChain);
  mockChain.insert.mockReturnValue(mockChain);
  mockChain.update.mockReturnValue(mockChain);
  mockChain.eq.mockReturnValue(mockChain);
  mockChain.or.mockReturnValue(mockChain);

  // Default: from(tableName) returns mockChain
  const fromMock = vi.fn().mockReturnValue(mockChain);

  // createServiceRoleClient() returns { from: fromMock, rpc: mockChain.rpc }
  vi.mocked(createServiceRoleClient).mockReturnValue({
    from: fromMock,
    rpc: mockChain.rpc,
  } as unknown as ReturnType<typeof createServiceRoleClient>);

  return mockChain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── processProducts: create mode ──────────────────────────────────────

describe("processProducts (create mode)", () => {
  it("should insert new products and create stock via RPC (REQ-2.1)", async () => {
    const chain = createMockChain();
    const products = [
      makeProduct(),
      makeProduct({ name: "Product B", slug: "product-b" }),
    ];

    // Simulate fresh slugs (no conflicts)
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    // Simulate successful insert
    chain.single
      .mockResolvedValueOnce({
        data: { id: "prod-1", name: "Test Product", slug: "test-product" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: "prod-2", name: "Product B", slug: "product-b" },
        error: null,
      });

    const result = await processProducts(products, "create", "branch-1");

    expect(result.created).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);

    // Stock RPC should be called for each product
    expect(chain.rpc).toHaveBeenCalledTimes(2);
    expect(chain.rpc).toHaveBeenCalledWith("update_product_stock", {
      p_product_id: "prod-1",
      p_branch_id: "branch-1",
      p_quantity_change: 10,
    });
  });

  it("should handle duplicate slug error (PG 23505) gracefully (REQ-2.6)", async () => {
    const chain = createMockChain();
    const products = [makeProduct()];

    chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    // Simulate duplicate slug: insert resolves with error (does not reject)
    chain.single.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "products_slug_key"',
      },
    });

    const result = await processProducts(products, "create", "branch-1");

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("slug");
    expect(result.errors[0].message).toContain("test-product");
  });

  it("should skip products without name and report error", async () => {
    createMockChain();
    const products = [makeProduct({ name: "" })];

    const result = await processProducts(products, "create", "branch-1");

    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Nombre");
  });

  it("should generate unique slug when slug is not provided (create mode)", async () => {
    const chain = createMockChain();
    const products = [makeProduct({ slug: undefined })];

    // generateUniqueSlug: slug not found
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    // insert succeeds
    chain.single.mockResolvedValue({
      data: { id: "prod-1", name: "Test Product", slug: "test-product" },
      error: null,
    });

    const result = await processProducts(products, "create", "branch-1");

    expect(result.created).toBe(1);
    expect(result.errors).toHaveLength(0);

    // verify generateUniqueSlug was called (slug from name)
    expect(chain.maybeSingle).toHaveBeenCalled();
    expect(chain.rpc).toHaveBeenCalledTimes(1);
  });
});

// ─── processProducts: update mode ──────────────────────────────────────

describe("processProducts (update mode)", () => {
  it("should find existing product, update it, and sync stock differentially (REQ-2.2)", async () => {
    const chain = createMockChain();
    const products = [makeProduct({ stock_quantity: 5 })];

    // Existing product found by slug (generateUniqueSlug skipped since slug is provided)
    chain.maybeSingle.mockResolvedValue({
      data: { id: "existing-1" },
      error: null,
    });

    const result = await processProducts(products, "update", "branch-1");

    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(0);

    // Should have called update (not insert)
    expect(chain.update).toHaveBeenCalledTimes(1);
    expect(chain.insert).not.toHaveBeenCalled();

    // Stock RPC called with quantity change
    expect(chain.rpc).toHaveBeenCalledWith("update_product_stock", {
      p_product_id: "existing-1",
      p_branch_id: "branch-1",
      p_quantity_change: 5,
    });
  });

  it("should skip non-existing products with a warning (REQ-2.5)", async () => {
    const chain = createMockChain();
    const products = [
      makeProduct({ name: "Ghost Product", slug: "ghost-slug" }),
    ];

    // Existing product lookup: not found (generateUniqueSlug skipped since slug is provided)
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await processProducts(products, "update", "branch-1");

    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("Ghost Product");
    expect(result.warnings[0]).toContain("mode=upsert");
    expect(chain.insert).not.toHaveBeenCalled();
  });
});

// ─── processProducts: upsert mode ──────────────────────────────────────

describe("processProducts (upsert mode)", () => {
  it("should update existing product and create new one (REQ-2.3)", async () => {
    const chain = createMockChain();
    const existingProduct = makeProduct({ name: "Existing", slug: "existing" });
    const newProduct = makeProduct({
      name: "New Product",
      slug: "new-product",
    });
    const products = [existingProduct, newProduct];

    // Slug checks for upsert lookup (generateUniqueSlug skipped since slugs are provided)
    // First product: existing → found
    chain.maybeSingle
      .mockResolvedValueOnce({
        data: { id: "existing-1", slug: "existing" },
        error: null,
      })
      // Second product: new → not found
      .mockResolvedValueOnce({ data: null, error: null });

    // Insert for the new product
    chain.single.mockResolvedValue({
      data: { id: "new-id", name: "New Product", slug: "new-product" },
      error: null,
    });

    const result = await processProducts(products, "upsert", "branch-1");

    expect(result.updated).toBe(1);
    expect(result.created).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Existing product should be updated, new product inserted
    expect(chain.update).toHaveBeenCalledTimes(1);
    expect(chain.insert).toHaveBeenCalledTimes(1);

    // Stock RPC called for both
    expect(chain.rpc).toHaveBeenCalledTimes(2);
  });
});

// ─── processProducts: branchId=null ────────────────────────────────────

describe("processProducts (branchId = null)", () => {
  it("should create products without calling stock RPC (REQ-2.4)", async () => {
    const chain = createMockChain();
    const products = [
      makeProduct(),
      makeProduct({ name: "Product B", slug: "product-b" }),
    ];

    chain.maybeSingle.mockResolvedValue({ data: null, error: null });
    chain.single
      .mockResolvedValueOnce({
        data: { id: "prod-1", name: "Test Product", slug: "test-product" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: "prod-2", name: "Product B", slug: "product-b" },
        error: null,
      });

    const result = await processProducts(products, "create", null);

    expect(result.created).toBe(2);
    expect(result.errors).toHaveLength(0);

    // RPC should NOT be called when branchId is null
    expect(chain.rpc).not.toHaveBeenCalled();
  });
});

// ─── generateUniqueSlug ────────────────────────────────────────────────

describe("generateUniqueSlug", () => {
  it("should return base slug when no conflict exists (REQ-2.7)", async () => {
    const chain = createMockChain();
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const slug = await generateUniqueSlug("New Product");

    expect(slug).toBe("new-product");
  });

  it("should append timestamp when slug already exists (REQ-2.7)", async () => {
    const chain = createMockChain();
    chain.maybeSingle.mockResolvedValue({
      data: { slug: "new-product" },
      error: null,
    });

    const slug = await generateUniqueSlug("New Product");

    expect(slug).toMatch(/^new-product-\d+$/);
  });
});

// ─── resolveCategoryId ─────────────────────────────────────────────────

describe("resolveCategoryId", () => {
  it("should pass through a valid UUID", async () => {
    const chain = createMockChain();
    const uuid = "550e8400-e29b-41d4-a716-446655440000";

    chain.maybeSingle.mockResolvedValue({ data: { id: uuid }, error: null });

    const result = await resolveCategoryId(uuid);

    expect(result).toBe(uuid);
    // Should query by id (UUID check)
    expect(chain.eq).toHaveBeenCalledWith("id", uuid);
  });

  it("should resolve by name and return existing category id", async () => {
    const chain = createMockChain();
    // First maybeSingle (by name) returns a match
    chain.maybeSingle.mockResolvedValue({
      data: { id: "cat-lentes" },
      error: null,
    });

    const result = await resolveCategoryId("Lentes");

    expect(result).toBe("cat-lentes");
    expect(chain.eq).toHaveBeenCalledWith("name", "Lentes");
  });

  it("should create a new category if not found by name or slug", async () => {
    const chain = createMockChain();
    // All lookups return null
    chain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // by name: not found
      .mockResolvedValueOnce({ data: null, error: null }); // by slug: not found
    // insert + select + single succeeds
    chain.single.mockResolvedValue({
      data: { id: "cat-new" },
      error: null,
    });

    const result = await resolveCategoryId("Nueva Categoría");

    expect(result).toBe("cat-new");
    expect(chain.insert).toHaveBeenCalledWith({
      name: "Nueva Categoría",
      slug: "nueva-categoria",
    });
  });

  it("should resolve by slug when name lookup fails", async () => {
    const chain = createMockChain();

    // by name: not found, by slug: found
    chain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // by name
      .mockResolvedValueOnce({ data: { id: "cat-slug-found" }, error: null }); // by slug

    const result = await resolveCategoryId("lentes-de-sol");

    expect(result).toBe("cat-slug-found");
    expect(chain.eq).toHaveBeenCalledWith("slug", "lentes-de-sol");
  });

  it("should return null for empty input", async () => {
    const result = await resolveCategoryId("");
    expect(result).toBeNull();
  });
});
