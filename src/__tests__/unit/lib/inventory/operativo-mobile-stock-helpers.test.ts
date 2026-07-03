/**
 * Unit tests for operativo-mobile-stock-helpers — mobile field operation stock.
 *
 * Supabase is mocked inline with a chainable query builder.
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
// Shared supabase mock builder
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
  chain.update = vi.fn(() => chain);
  chain.then = vi.fn((onfulfilled: (v: unknown) => unknown) =>
    Promise.resolve(chain._directResult).then(onfulfilled),
  );

  const supabase = { from: vi.fn(() => chain) };

  return {
    supabase: supabase as unknown as ReturnType<typeof Object>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chain: chain as Record<string, any>,
  };
}

import {
  getOperativoMobileAvailableQuantity,
  reduceOperativoMobileStock,
} from "@/lib/inventory/operativo-mobile-stock-helpers";

describe("getOperativoMobileAvailableQuantity", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chain: any;
  let supabase: ReturnType<typeof Object>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    chain = mock.chain;
    supabase = mock.supabase;
  });

  it("should return available quantity when record found", async () => {
    chain.maybeSingle.mockResolvedValue({
      data: { quantity: 50, reserved_quantity: 10 },
      error: null,
    });

    const result = await getOperativoMobileAvailableQuantity(
      "prod-1",
      "op-1",
      supabase,
    );

    expect(result).toBe(40);
    expect(supabase.from).toHaveBeenCalledWith("operativo_mobile_stock");
  });

  it("should return 0 when no record exists", async () => {
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getOperativoMobileAvailableQuantity(
      "prod-1",
      "op-1",
      supabase,
    );

    expect(result).toBe(0);
  });

  it("should return 0 on Supabase error", async () => {
    chain.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const result = await getOperativoMobileAvailableQuantity(
      "prod-1",
      "op-1",
      supabase,
    );

    expect(result).toBe(0);
  });

  it("should return 0 when quantity is null", async () => {
    chain.maybeSingle.mockResolvedValue({
      data: { quantity: null, reserved_quantity: null },
      error: null,
    });

    const result = await getOperativoMobileAvailableQuantity(
      "prod-1",
      "op-1",
      supabase,
    );

    expect(result).toBe(0);
  });

  it("should return 0 on exception", async () => {
    chain.maybeSingle.mockRejectedValue(new Error("Network error"));

    const result = await getOperativoMobileAvailableQuantity(
      "prod-1",
      "op-1",
      supabase,
    );

    expect(result).toBe(0);
  });
});

describe("reduceOperativoMobileStock", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chain: any;
  let supabase: ReturnType<typeof Object>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    chain = mock.chain;
    supabase = mock.supabase;
  });

  it("should return success when quantity <= 0 (no-op)", async () => {
    const result = await reduceOperativoMobileStock(
      "prod-1",
      "op-1",
      0,
      supabase,
    );

    expect(result.success).toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("should reduce stock and return success", async () => {
    chain.single.mockResolvedValue({
      data: {
        id: "stock-1",
        quantity: 30,
        reserved_quantity: 5,
      },
      error: null,
    });
    chain.update.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    // The chain's .then resolves to _directResult
    chain._directResult = { data: null, error: null };

    const result = await reduceOperativoMobileStock(
      "prod-1",
      "op-1",
      10,
      supabase,
    );

    expect(result.success).toBe(true);
    // New quantity should be 30 - 10 = 20
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 20 }),
    );
  });

  it("should return error when product not found", async () => {
    chain.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    const result = await reduceOperativoMobileStock(
      "prod-1",
      "op-1",
      5,
      supabase,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Producto no encontrado");
  });

  it("should return error when insufficient stock", async () => {
    chain.single.mockResolvedValue({
      data: {
        id: "stock-1",
        quantity: 5,
        reserved_quantity: 2,
      },
      error: null,
    });

    const result = await reduceOperativoMobileStock(
      "prod-1",
      "op-1",
      10,
      supabase,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Stock insuficiente");
    expect(result.error).toContain("Disponible: 3");
  });

  it("should return error on update failure", async () => {
    chain.single.mockResolvedValue({
      data: {
        id: "stock-1",
        quantity: 30,
        reserved_quantity: 0,
      },
      error: null,
    });
    chain._directResult = {
      data: null,
      error: { message: "Update failed" },
    };

    const result = await reduceOperativoMobileStock(
      "prod-1",
      "op-1",
      5,
      supabase,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Update failed");
  });

  it("should return error on exception", async () => {
    chain.single.mockRejectedValue(new Error("DB timeout"));

    const result = await reduceOperativoMobileStock(
      "prod-1",
      "op-1",
      5,
      supabase,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB timeout");
  });
});
