/**
 * Unit Tests for client-helpers (ApiClient, type guards, pagination helpers)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiClient,
  fetchCustomers,
  formatErrorForDisplay,
  getErrorMessage,
  getValidationErrors,
  handlePaginatedResponse,
  isError,
  isSuccess,
  isValidationError,
  queryFn,
  unwrapData,
} from "@/lib/api/client-helpers";
import type { ApiResponse, PaginationMeta } from "@/lib/api/response";

// --- Helpers ---

function successResponse<T>(data: T, meta?: { pagination?: PaginationMeta }): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), ...meta },
  } as ApiResponse<T>;
}

function errorResponse(code: string, message: string, details?: unknown): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, timestamp: new Date().toISOString(), ...(details && { details }) },
  } as ApiResponse<never>;
}

// --- ApiClient ---

describe("ApiClient", () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient("http://test.local");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      // Spy catches the call — we override via mockResponse
      return new Response("null", { status: 200 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(response: ApiResponse<unknown>) {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 200 }));
  }

  describe("get", () => {
    it("makes a GET request and returns typed response", async () => {
      const expected = successResponse({ id: 1, name: "test" });
      mockFetch(expected);

      const result = await client.get<{ id: number; name: string }>("/test");

      expect(result).toEqual(expected);
      expect(fetch).toHaveBeenCalledWith("http://test.local/test", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
    });

    it("passes additional options through", async () => {
      mockFetch(successResponse([]));
      await client.get("/test", { signal: new AbortController().signal });

      const call = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      expect(call.signal).toBeDefined();
    });

    it("preserves custom headers alongside defaults", async () => {
      mockFetch(successResponse([]));
      await client.get("/test", { headers: { Authorization: "Bearer x" } });

      const call = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      expect(call.headers).toMatchObject({
        "Content-Type": "application/json",
        Authorization: "Bearer x",
      });
    });

    it("returns NETWORK_ERROR on fetch rejection", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Connection refused"));

      const result = await client.get("/test");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NETWORK_ERROR");
        expect(result.error.message).toBe("Connection refused");
      }
    });

    it("returns NETWORK_ERROR on invalid JSON", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response("not json", { status: 200 }));
      // JSON.parse will throw, caught in request()
      const result = await client.get("/test");

      expect(result.success).toBe(false);
    });
  });

  describe("post", () => {
    it("sends JSON body on POST", async () => {
      mockFetch(successResponse({ id: 1 }));
      const payload = { name: "new" };

      await client.post("/items", payload);

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call[1]).toMatchObject({ method: "POST" });
      expect(JSON.parse(call[1]!.body as string)).toEqual(payload);
    });

    it("omits body when no data is passed", async () => {
      mockFetch(successResponse(null));
      await client.post("/items");

      const call = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      expect(call.method).toBe("POST");
      expect(call.body).toBeUndefined();
    });
  });

  describe("put", () => {
    it("sends JSON body on PUT", async () => {
      mockFetch(successResponse({ id: 1 }));
      const payload = { name: "updated" };

      await client.put("/items/1", payload);

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call[1]).toMatchObject({ method: "PUT" });
      expect(JSON.parse(call[1]!.body as string)).toEqual(payload);
    });
  });

  describe("delete", () => {
    it("makes a DELETE request", async () => {
      mockFetch(successResponse(null));
      await client.delete("/items/1");

      expect(fetch).toHaveBeenCalledWith("http://test.local/items/1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    });
  });

  describe("empty baseUrl", () => {
    it("uses relative URL when no baseUrl given", async () => {
      const local = new ApiClient();
      mockFetch(successResponse(null));
      await client.get("/test");

      expect(fetch).toHaveBeenCalledWith("http://test.local/test", expect.anything());
    });
  });
});

// --- Type guards ---

describe("type guards", () => {
  it("isSuccess returns true for success response", () => {
    expect(isSuccess(successResponse("ok"))).toBe(true);
  });

  it("isSuccess returns false for error response", () => {
    expect(isSuccess(errorResponse("ERR", "fail"))).toBe(false);
  });

  it("isError returns true for error response", () => {
    expect(isError(errorResponse("ERR", "fail"))).toBe(true);
  });

  it("isError returns false for success response", () => {
    expect(isError(successResponse("ok"))).toBe(false);
  });
});

// --- unwrapData ---

describe("unwrapData", () => {
  it("returns data on success", () => {
    expect(unwrapData(successResponse("hello"))).toBe("hello");
  });

  it("returns data for objects", () => {
    expect(unwrapData(successResponse({ a: 1 }))).toEqual({ a: 1 });
  });

  it("throws on error response", () => {
    expect(() => unwrapData(errorResponse("NOT_FOUND", "Missing"))).toThrow("Missing");
  });

  it("throws generic message when error is malformed", () => {
    const bad = { success: false as const, error: null as unknown as ApiResponse<never>["error"] };
    expect(() => unwrapData(bad as unknown as ApiResponse<never>)).toThrow(
      "An unknown error occurred",
    );
  });
});

// --- getErrorMessage ---

describe("getErrorMessage", () => {
  it("returns error message from error response", () => {
    expect(getErrorMessage(errorResponse("ERR", "something failed"))).toBe("something failed");
  });

  it('returns "Unknown error" from success response', () => {
    expect(getErrorMessage(successResponse("ok"))).toBe("Unknown error");
  });

  it('returns "Unknown error" when message is missing', () => {
    const resp = {
      success: false as const,
      error: { code: "ERR", timestamp: new Date().toISOString() },
    };
    expect(getErrorMessage(resp as unknown as ApiResponse<never>)).toBe("Unknown error");
  });
});

// --- queryFn (React Query helper) ---

describe("queryFn", () => {
  it("returns data on success", async () => {
    const fetcher = vi.fn().mockResolvedValue(successResponse([1, 2, 3]));
    await expect(queryFn(fetcher)).resolves.toEqual([1, 2, 3]);
  });

  it("throws on error response", async () => {
    const fetcher = vi.fn().mockResolvedValue(errorResponse("ERR", "boom"));
    await expect(queryFn(fetcher)).rejects.toThrow("boom");
  });
});

// --- handlePaginatedResponse ---

describe("handlePaginatedResponse", () => {
  it("returns data and pagination on success", () => {
    const pagination: PaginationMeta = { page: 2, limit: 10, total: 50, totalPages: 5 };
    const result = handlePaginatedResponse(successResponse(["a", "b"], { pagination }));

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(["a", "b"]);
    expect(result.pagination).toEqual(pagination);
    expect(result.error).toBeUndefined();
  });

  it("computes default pagination when meta is missing", () => {
    const result = handlePaginatedResponse(successResponse(["x"]));

    expect(result.isSuccess).toBe(true);
    expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
  });

  it("returns empty data and error on failure", () => {
    const result = handlePaginatedResponse(errorResponse("ERR", "failed"));

    expect(result.isSuccess).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toBe("failed");
    expect(result.pagination.total).toBe(0);
  });
});

// --- Validation error helpers ---

describe("validation error helpers", () => {
  it("isValidationError returns true for VALIDATION_ERROR", () => {
    expect(isValidationError(errorResponse("VALIDATION_ERROR", "bad input"))).toBe(true);
  });

  it("isValidationError returns false for other errors", () => {
    expect(isValidationError(errorResponse("NOT_FOUND", "missing"))).toBe(false);
  });

  it("isValidationError returns false for success", () => {
    expect(isValidationError(successResponse("ok"))).toBe(false);
  });

  it("getValidationErrors returns null for non-error", () => {
    expect(getValidationErrors(successResponse("ok"))).toBeNull();
  });

  it("getValidationErrors returns null for non-validation error", () => {
    expect(getValidationErrors(errorResponse("ERR", "msg"))).toBeNull();
  });

  it("getValidationErrors extracts field errors", () => {
    const details = [
      { field: "email", message: "Invalid email" },
      { field: "age", message: "Too young" },
    ];
    const resp = errorResponse("VALIDATION_ERROR", "Invalid fields", details);
    expect(getValidationErrors(resp)).toEqual(details);
  });

  it("getValidationErrors returns null for non-array details", () => {
    const resp = errorResponse("VALIDATION_ERROR", "Invalid fields", { something: "else" });
    expect(getValidationErrors(resp)).toBeNull();
  });
});

// --- formatErrorForDisplay ---

describe("formatErrorForDisplay", () => {
  it("returns empty string for success", () => {
    expect(formatErrorForDisplay(successResponse("ok"))).toBe("");
  });

  it("returns validation errors joined", () => {
    const details = [
      { field: "email", message: "Invalid email" },
      { field: "age", message: "Too young" },
    ];
    const resp = errorResponse("VALIDATION_ERROR", "Invalid fields", details);
    expect(formatErrorForDisplay(resp)).toBe("email: Invalid email, age: Too young");
  });

  it("returns error message for non-validation errors", () => {
    expect(formatErrorForDisplay(errorResponse("ERR", "something wrong"))).toBe("something wrong");
  });
});
