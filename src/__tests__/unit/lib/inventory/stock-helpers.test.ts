/**
 * Unit tests for stock-helpers — stock calculation and Supabase helpers.
 *
 * Supabase is mocked inline with a chainable query builder. The mock
 * exposes `chain` so each test can control `.single()`, `.maybeSingle()`,
 * `.rpc()` return values via the mock's resolved value.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — hoisted before imports
// ---------------------------------------------------------------------------
vi.mock("@/lib/logger", () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Shared supabase mock builder — chainable .from().select().eq().single()
// ---------------------------------------------------------------------------
function createMockSupabase() {
  const chain: Record<string, unknown> = {
    _directResult: { data: null, error: null },
  };

  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chain.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: null, error: null }),
  );
  chain.then = vi.fn((onfulfilled: (v: unknown) => unknown) =>
    Promise.resolve(chain._directResult).then(onfulfilled),
  );

  const rpcMock = vi.fn(() =>
    Promise.resolve({ data: null, error: null }),
  );
  const supabase = { from: vi.fn(() => chain), rpc: rpcMock };

  return {
    supabase: supabase as unknown as ReturnType<typeof Object>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chain: chain as Record<string, any>,
    rpcMock,
  };
}

import {
  getProductStock,
  getAvailableQuantity,
  updateProductStock,
  upsertProductStock,
} from "@/lib/inventory/stock-helpers";

describe("getProductStock", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chain: any;
  let supabase: ReturnType<typeof Object>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    chain = mock.chain;
    supabase = mock.supabase;
  });

  it("should return stock record when found", async () => {
    const stockRecord = {
      id: "stock-1",
      product_id: "prod-1",
      branch_id: "branch-1",
      quantity: 20,
      reserved_quantity: 3,
      low_stock_threshold: 5,
    };
    chain.single.mockResolvedValue({ data: stockRecord, error: null });

    const result = await getProductStock("prod-1", "branch-1", supabase);

    expect(result).toEqual(stockRecord);
    expect(supabase.from).toHaveBeenCalledWith("product_branch_stock");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("product_id", "prod-1");
    expect(chain.eq).toHaveBeenCalledWith("branch_id", "branch-1");
  });

  it("should return null when no stock record exists (PGRST116)", async () => {
    chain.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });

    const result = await getProductStock("prod-1", "branch-1", supabase);

    expect(result).toBeNull();
  });

  it("should return null on other errors", async () => {
    chain.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST500", message: "Internal error" },
    });

    const result = await getProductStock("prod-1", "branch-1", supabase);

    expect(result).toBeNull();
  });

  it("should return null on exception", async () => {
    chain.single.mockRejectedValue(new Error("Network error"));

    const result = await getProductStock("prod-1", "branch-1", supabase);

    expect(result).toBeNull();
  });
});

describe("getAvailableQuantity", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chain: any;
  let supabase: ReturnType<typeof Object>;
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    chain = mock.chain;
    supabase = mock.supabase;
    rpcMock = mock.rpcMock;
  });

  it("should return available quantity from RPC when successful", async () => {
    rpcMock.mockResolvedValue({
      data: { available_quantity: 17 },
      error: null,
    });

    const result = await getAvailableQuantity("prod-1", "branch-1", supabase);

    expect(result).toBe(17);
    expect(rpcMock).toHaveBeenCalledWith("get_product_stock", {
      p_product_id: "prod-1",
      p_branch_id: "branch-1",
    });
  });

  it("should handle RPC returning array", async () => {
    rpcMock.mockResolvedValue({
      data: [{ available_quantity: 10 }],
      error: null,
    });

    const result = await getAvailableQuantity("prod-1", "branch-1", supabase);

    expect(result).toBe(10);
  });

  it("should fallback to getProductStock when RPC fails", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "RPC not found" },
    });
    chain.single.mockResolvedValue({
      data: {
        id: "stock-1",
        product_id: "prod-1",
        branch_id: "branch-1",
        quantity: 15,
        reserved_quantity: 5,
        low_stock_threshold: 5,
      },
      error: null,
    });

    const result = await getAvailableQuantity("prod-1", "branch-1", supabase);

    expect(result).toBe(10); // 15 - 5
  });

  it("should return 0 when fallback stock is null", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "RPC not found" },
    });
    chain.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const result = await getAvailableQuantity("prod-1", "branch-1", supabase);

    expect(result).toBe(0);
  });

  it("should return 0 on exception", async () => {
    rpcMock.mockRejectedValue(new Error("DB timeout"));

    const result = await getAvailableQuantity("prod-1", "branch-1", supabase);

    expect(result).toBe(0);
  });
});

describe("updateProductStock", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chain: any;
  let supabase: ReturnType<typeof Object>;
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    chain = mock.chain;
    supabase = mock.supabase;
    rpcMock = mock.rpcMock;
  });

  it("should return success with updated stock", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    chain.single.mockResolvedValue({
      data: {
        id: "stock-1",
        product_id: "prod-1",
        branch_id: "branch-1",
        quantity: 20,
        reserved_quantity: 3,
        low_stock_threshold: 5,
      },
      error: null,
    });

    const result = await updateProductStock(
      "prod-1",
      "branch-1",
      5,
      false,
      supabase,
    );

    expect(result.success).toBe(true);
    expect(result.stock).toBeDefined();
    expect(result.stock!.quantity).toBe(20);
    expect(rpcMock).toHaveBeenCalledWith("update_product_stock", {
      p_product_id: "prod-1",
      p_branch_id: "branch-1",
      p_quantity_change: 5,
      p_reserve: false,
    });
  });

  it("should return error when RPC fails", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "Insufficient stock" },
    });

    const result = await updateProductStock(
      "prod-1",
      "branch-1",
      -50,
      false,
      supabase,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Insufficient stock");
  });

  it("should return error when RPC returns false", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });

    const result = await updateProductStock(
      "prod-1",
      "branch-1",
      10,
      false,
      supabase,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("update_product_stock returned false");
  });

  it("should return error on exception", async () => {
    rpcMock.mockRejectedValue(new Error("DB connection lost"));

    const result = await updateProductStock(
      "prod-1",
      "branch-1",
      5,
      false,
      supabase,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB connection lost");
  });
});

describe("upsertProductStock", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chain: any;
  let supabase: ReturnType<typeof Object>;
  let rpcMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    chain = mock.chain;
    supabase = mock.supabase;
    rpcMock = mock.rpcMock;
  });

  it("should upsert quantity and reserved when both change", async () => {
    // Current stock: qty=10, reserved=2
    chain.single.mockResolvedValue({
      data: {
        id: "stock-1",
        product_id: "prod-1",
        branch_id: "branch-1",
        quantity: 10,
        reserved_quantity: 2,
        low_stock_threshold: 5,
      },
      error: null,
    });
    // First RPC call (quantityChange = 15 - 10 = 5) — false (not reserved)
    // Second RPC call (reservedChange = 5 - 2 = 3) — true (is reserved)
    rpcMock
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null });

    const result = await upsertProductStock(
      "prod-1",
      "branch-1",
      15,
      5,
      supabase,
    );

    expect(result.success).toBe(true);
    // First call: update quantity by +5
    expect(rpcMock).toHaveBeenNthCalledWith(1, "update_product_stock", {
      p_product_id: "prod-1",
      p_branch_id: "branch-1",
      p_quantity_change: 5,
      p_reserve: false,
    });
    // Second call: update reserved by +3
    expect(rpcMock).toHaveBeenNthCalledWith(2, "update_product_stock", {
      p_product_id: "prod-1",
      p_branch_id: "branch-1",
      p_quantity_change: 3,
      p_reserve: true,
    });
  });

  it("should skip update when quantity delta is zero", async () => {
    chain.single.mockResolvedValue({
      data: {
        id: "stock-1",
        product_id: "prod-1",
        branch_id: "branch-1",
        quantity: 10,
        reserved_quantity: 2,
        low_stock_threshold: 5,
      },
      error: null,
    });
    // Only reservedChange = 3 -> 5
    rpcMock.mockResolvedValue({ data: true, error: null });

    const result = await upsertProductStock(
      "prod-1",
      "branch-1",
      10,
      5,
      supabase,
    );

    expect(result.success).toBe(true);
    // Only one RPC call — for reserved
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("update_product_stock", {
      p_product_id: "prod-1",
      p_branch_id: "branch-1",
      p_quantity_change: 3,
      p_reserve: true,
    });
  });

  it("should create stock when no current record exists", async () => {
    // No existing record
    chain.single
      .mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      })
      // updateProductStock calls getProductStock internally after RPC
      .mockResolvedValueOnce({
        data: {
          id: "stock-new",
          product_id: "prod-1",
          branch_id: "branch-1",
          quantity: 8,
          reserved_quantity: 0,
          low_stock_threshold: 5,
        },
        error: null,
      })
      // Final getProductStock call in upsertProductStock
      .mockResolvedValueOnce({
        data: {
          id: "stock-new",
          product_id: "prod-1",
          branch_id: "branch-1",
          quantity: 8,
          reserved_quantity: 0,
          low_stock_threshold: 5,
        },
        error: null,
      });
    rpcMock.mockResolvedValue({ data: true, error: null });

    const result = await upsertProductStock(
      "prod-1",
      "branch-1",
      8,
      0,
      supabase,
    );

    expect(result.success).toBe(true);
    expect(result.stock!.quantity).toBe(8);
    // quantityChange = 8 - 0 = 8
    expect(rpcMock).toHaveBeenCalledWith("update_product_stock", {
      p_product_id: "prod-1",
      p_branch_id: "branch-1",
      p_quantity_change: 8,
      p_reserve: false,
    });
  });

  it("should return error if first RPC fails", async () => {
    chain.single.mockResolvedValue({
      data: {
        id: "stock-1",
        product_id: "prod-1",
        branch_id: "branch-1",
        quantity: 10,
        reserved_quantity: 2,
        low_stock_threshold: 5,
      },
      error: null,
    });
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "RPC failed" },
    });

    const result = await upsertProductStock(
      "prod-1",
      "branch-1",
      20,
      5,
      supabase,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("RPC failed");
  });

  it("should handle negative quantity as zero (Math.max)", async () => {
    chain.single.mockResolvedValue({
      data: {
        id: "stock-1",
        product_id: "prod-1",
        branch_id: "branch-1",
        quantity: 10,
        reserved_quantity: 2,
        low_stock_threshold: 5,
      },
      error: null,
    });
    rpcMock.mockResolvedValue({ data: true, error: null });

    // quantity = -5 should become 0 via Math.max
    const result = await upsertProductStock(
      "prod-1",
      "branch-1",
      -5,
      0,
      supabase,
    );

    expect(result.success).toBe(true);
    // quantityChange = 0 - 10 = -10
    expect(rpcMock).toHaveBeenCalledWith("update_product_stock", {
      p_product_id: "prod-1",
      p_branch_id: "branch-1",
      p_quantity_change: -10,
      p_reserve: false,
    });
  });
});
