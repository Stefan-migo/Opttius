/**
 * Unit Tests for response-helpers (extractDataFromResponse, pagination helpers, etc.)
 *
 * These are pure functions — no mocks needed.
 */

import { describe, expect, it } from "vitest";

import {
  extractDataFromResponse,
  extractErrorFromResponse,
  extractPaginationFromResponse,
  extractTotalFromResponse,
  isResponseSuccessful,
} from "@/lib/api/response-helpers";

// ---------------------------------------------------------------------------
// extractDataFromResponse
// ---------------------------------------------------------------------------
describe("extractDataFromResponse", () => {
  it("returns empty array for null/undefined", () => {
    expect(extractDataFromResponse(null)).toEqual([]);
    expect(extractDataFromResponse(undefined)).toEqual([]);
  });

  it("extracts data from standardized format", () => {
    const resp = { success: true, data: [{ id: 1 }, { id: 2 }] };
    expect(extractDataFromResponse(resp)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("extracts data from legacy customers format", () => {
    const resp = { customers: [{ id: 10 }], pagination: { page: 1 } };
    expect(extractDataFromResponse(resp)).toEqual([{ id: 10 }]);
  });

  it("extracts data from legacy products format", () => {
    const resp = { products: [{ sku: "A" }] };
    expect(extractDataFromResponse(resp)).toEqual([{ sku: "A" }]);
  });

  it("extracts from legacy work_orders format", () => {
    const resp = { work_orders: [{ ot: "OT-1" }] };
    expect(extractDataFromResponse(resp)).toEqual([{ ot: "OT-1" }]);
  });

  it("extracts from legacy workOrders format", () => {
    const resp = { workOrders: [{ ot: "OT-1" }] };
    expect(extractDataFromResponse(resp)).toEqual([{ ot: "OT-1" }]);
  });

  it("extracts from legacy appointments format", () => {
    const resp = { appointments: [{ date: "2024-01-01" }] };
    expect(extractDataFromResponse(resp)).toEqual([{ date: "2024-01-01" }]);
  });

  it("returns empty array when no known key found", () => {
    const resp = { unknown: [{ id: 1 }] };
    expect(extractDataFromResponse(resp)).toEqual([]);
  });

  it("returns empty array when data is not an array in standardized format", () => {
    const resp = { success: true, data: { id: 1 } };
    expect(extractDataFromResponse(resp)).toEqual([]);
  });

  it("returns empty array for empty object", () => {
    expect(extractDataFromResponse({})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractPaginationFromResponse
// ---------------------------------------------------------------------------
describe("extractPaginationFromResponse", () => {
  it("returns default pagination for null/undefined", () => {
    const def = { page: 1, limit: 10, total: 0, totalPages: 0 };
    expect(extractPaginationFromResponse(null)).toEqual(def);
    expect(extractPaginationFromResponse(undefined)).toEqual(def);
  });

  it("extracts from standardized format", () => {
    const pagination = { page: 2, limit: 25, total: 100, totalPages: 4 };
    const resp = { success: true, data: [], meta: { pagination } };
    expect(extractPaginationFromResponse(resp)).toEqual(pagination);
  });

  it("extracts from legacy format", () => {
    const pagination = { page: 1, limit: 10, total: 50, totalPages: 5 };
    const resp = { customers: [], pagination };
    expect(extractPaginationFromResponse(resp)).toEqual(pagination);
  });

  it("prioritizes standardized pagination over legacy", () => {
    const resp = {
      success: true,
      data: [],
      meta: { pagination: { page: 3, limit: 10, total: 30, totalPages: 3 } },
      pagination: { page: 1, limit: 10, total: 5, totalPages: 1 },
    };
    const result = extractPaginationFromResponse(resp);
    expect(result.page).toBe(3);
  });

  it("returns defaults when no pagination found", () => {
    expect(extractPaginationFromResponse({})).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// extractTotalFromResponse
// ---------------------------------------------------------------------------
describe("extractTotalFromResponse", () => {
  it("returns 0 for null/undefined", () => {
    expect(extractTotalFromResponse(null)).toBe(0);
    expect(extractTotalFromResponse(undefined)).toBe(0);
  });

  it("extracts from standardized format", () => {
    const resp = { success: true, data: [], meta: { pagination: { total: 42 } } };
    expect(extractTotalFromResponse(resp)).toBe(42);
  });

  it("extracts from legacy top-level total", () => {
    const resp = { customers: [], total: 99 };
    expect(extractTotalFromResponse(resp)).toBe(99);
  });

  it("extracts from legacy pagination.total", () => {
    const resp = { customers: [], pagination: { total: 77 } };
    expect(extractTotalFromResponse(resp)).toBe(77);
  });

  it("prioritizes standardized total over legacy total", () => {
    const resp = {
      success: true,
      data: [],
      meta: { pagination: { total: 10 } },
      total: 99,
    };
    expect(extractTotalFromResponse(resp)).toBe(10);
  });

  it("returns 0 when no total found", () => {
    expect(extractTotalFromResponse({})).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isResponseSuccessful
// ---------------------------------------------------------------------------
describe("isResponseSuccessful", () => {
  it("returns false for null/undefined", () => {
    expect(isResponseSuccessful(null)).toBe(false);
    expect(isResponseSuccessful(undefined)).toBe(false);
  });

  it("returns true when success is true", () => {
    expect(isResponseSuccessful({ success: true })).toBe(true);
  });

  it("returns false when success is false", () => {
    expect(isResponseSuccessful({ success: false })).toBe(false);
  });

  it("returns true for legacy format with no error field", () => {
    expect(isResponseSuccessful({ customers: [] })).toBe(true);
  });

  it("returns false for legacy format with error field", () => {
    expect(isResponseSuccessful({ error: "Server error" })).toBe(false);
  });

  it("returns false for legacy format with error object", () => {
    expect(isResponseSuccessful({ error: { message: "fail" } })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractErrorFromResponse
// ---------------------------------------------------------------------------
describe("extractErrorFromResponse", () => {
  it("returns null for null/undefined", () => {
    expect(extractErrorFromResponse(null)).toBeNull();
    expect(extractErrorFromResponse(undefined)).toBeNull();
  });

  it("extracts from standardized format", () => {
    const resp = { success: false, error: { message: "Not found" } };
    expect(extractErrorFromResponse(resp)).toBe("Not found");
  });

  it("returns null for standardized success", () => {
    const resp = { success: true, data: [] };
    expect(extractErrorFromResponse(resp)).toBeNull();
  });

  it("extracts string error from legacy format", () => {
    const resp = { error: "Legacy error" };
    expect(extractErrorFromResponse(resp)).toBe("Legacy error");
  });

  it("extracts message from legacy error object", () => {
    const resp = { error: { message: "Legacy object error" } };
    expect(extractErrorFromResponse(resp)).toBe("Legacy object error");
  });

  it('returns "Unknown error" when legacy error object has no message', () => {
    const resp = { error: { code: 500 } };
    expect(extractErrorFromResponse(resp)).toBe("Unknown error");
  });

  it("returns null when no error found", () => {
    expect(extractErrorFromResponse({ data: [] })).toBeNull();
  });
});
