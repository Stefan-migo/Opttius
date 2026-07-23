/**
 * Unit tests for error-handler middleware
 *
 * Tests withErrorHandling, HTTP method wrappers,
 * validation helpers, pagination, and response helpers.
 *
 * @module __tests__/unit/lib/middleware/error-handler.test
 */

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@/lib/logger", () => ({
  appLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/errors/comprehensive-handler", () => ({
  ApplicationError: class AppError extends Error {
    code: string;
    statusCode: number;
    isOperational: boolean;
    details?: Record<string, unknown>;

    constructor(
      message: string,
      opts: {
        code: string;
        statusCode?: number;
        details?: Record<string, unknown>;
      },
    ) {
      super(message);
      this.name = this.constructor.name;
      this.code = opts.code;
      this.statusCode = opts.statusCode ?? 500;
      this.isOperational = true;
      this.details = opts.details;
    }
  },
  AuthenticationError: class AuthError extends Error {
    code = "AUTHENTICATION_ERROR";
    statusCode = 401;
    constructor(message = "Authentication required") {
      super(message);
      this.name = "AuthenticationError";
    }
  },
  AuthorizationError: class AuthzError extends Error {
    code = "AUTHORIZATION_ERROR";
    statusCode = 403;
    constructor(message = "Insufficient permissions") {
      super(message);
      this.name = "AuthorizationError";
    }
  },
  handleApiError: vi.fn(),
}));

// --- Imports (after mocks) ---

import { handleApiError } from "@/lib/errors/comprehensive-handler";
import {
  handleDelete,
  handleGet,
  handlePost,
  handlePut,
  paginatedResponse,
  parsePagination,
  successResponse,
  validateQueryParams,
  validateRequestBody,
  withErrorHandling,
} from "@/lib/middleware/error-handler";

// --- Helpers ---

function makeRequest(overrides: Partial<NextRequest> = {}): NextRequest {
  return {
    url: "http://localhost:3000/api/test",
    headers: new Headers(),
    method: "GET",
    json: vi.fn(),
    ...overrides,
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// withErrorHandling
// ---------------------------------------------------------------------------
describe("withErrorHandling", () => {
  it("should return the handler response on success", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withErrorHandling(handler);
    const request = makeRequest();

    const response = await wrapped(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it("should add X-Request-ID header on success", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withErrorHandling(handler);
    const request = makeRequest();

    const response = await wrapped(request);

    expect(response.headers.get("X-Request-ID")).toEqual(expect.any(String));
  });

  it("should catch ApplicationError and return formatted response", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "VALIDATION_ERROR",
          message: "bad input",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "req_test",
        },
      },
      statusCode: 400,
    });

    const handler = vi.fn().mockRejectedValue(new Error("bad input"));
    const wrapped = withErrorHandling(handler);
    const request = makeRequest();

    const response = await wrapped(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("bad input");
  });

  it("should add X-Request-ID header on error response", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "INTERNAL_ERROR",
          message: "fail",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "req_test",
        },
      },
      statusCode: 500,
    });

    const handler = vi.fn().mockRejectedValue(new Error("fail"));
    const wrapped = withErrorHandling(handler);
    const request = makeRequest();

    const response = await wrapped(request);

    expect(response.headers.get("X-Request-ID")).toEqual(expect.any(String));
  });

  it("should call handleApiError with the thrown error and requestId", async () => {
    const thrown = new Error("something broke");
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "INTERNAL_ERROR",
          message: "something broke",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "req_test",
        },
      },
      statusCode: 500,
    });

    const handler = vi.fn().mockRejectedValue(thrown);
    const wrapped = withErrorHandling(handler);
    const request = makeRequest();

    await wrapped(request);

    expect(handleApiError).toHaveBeenCalledWith(thrown, expect.any(String));
  });

  it("should throw AuthenticationError when requireAuth but no auth header", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "AUTHENTICATION_ERROR",
          message: "Missing or invalid authorization header",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "req_test",
        },
      },
      statusCode: 401,
    });

    const handler = vi.fn();
    const wrapped = withErrorHandling(handler, { requireAuth: true });
    const request = makeRequest(); // no Authorization header

    const response = await wrapped(request);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("should throw AuthenticationError for non-Bearer auth header", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "AUTHENTICATION_ERROR",
          message: "Missing or invalid authorization header",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "req_test",
        },
      },
      statusCode: 401,
    });

    const handler = vi.fn();
    const wrapped = withErrorHandling(handler, { requireAuth: true });
    const request = makeRequest({
      headers: new Headers({ authorization: "Basic abc" }),
    });

    const response = await wrapped(request);
    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("should call handler when requireAuth and auth header is present", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withErrorHandling(handler, { requireAuth: true });
    const request = makeRequest({
      headers: new Headers({ authorization: "Bearer valid-token" }),
    });

    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("should allow requireAdmin check to pass through to handler", async () => {
    // With requireAdmin, the code checks allowedRoles; if not set, it passes
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withErrorHandling(handler, {
      requireAdmin: true,
      allowedRoles: ["user"],
    });
    const request = makeRequest({
      headers: new Headers({ authorization: "Bearer admin-token" }),
    });

    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// HTTP method wrappers
// ---------------------------------------------------------------------------
describe("HTTP method wrappers", () => {
  it("handleGet should wrap handler and return response", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = handleGet(handler);
    const request = makeRequest();

    const response = await wrapped(request);
    expect(response.status).toBe(200);
  });

  it("handlePost should wrap handler and return response", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ created: true }));
    const wrapped = handlePost(handler);
    const request = makeRequest();

    const response = await wrapped(request);
    expect(response.status).toBe(200);
  });

  it("handlePut should wrap handler and return response", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ updated: true }));
    const wrapped = handlePut(handler);
    const request = makeRequest();

    const response = await wrapped(request);
    expect(response.status).toBe(200);
  });

  it("handleDelete should wrap handler and return response", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ deleted: true }));
    const wrapped = handleDelete(handler);
    const request = makeRequest();

    const response = await wrapped(request);
    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// validateRequestBody
// ---------------------------------------------------------------------------
describe("validateRequestBody", () => {
  it("should parse JSON body and return validator result", async () => {
    const request = makeRequest({
      json: vi.fn().mockResolvedValue({ name: "John", age: 30 }),
    });
    const validator = vi.fn().mockImplementation((data) => data as { name: string; age: number });

    const result = await validateRequestBody(request, validator);

    expect(result).toEqual({ name: "John", age: 30 });
    expect(validator).toHaveBeenCalledWith({ name: "John", age: 30 });
  });

  it("should throw ApplicationError for invalid JSON (SyntaxError)", async () => {
    const request = makeRequest({
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    });

    await expect(
      validateRequestBody(request, vi.fn()),
    ).rejects.toThrow("Invalid JSON in request body");
  });

  it("should re-throw non-SyntaxError exceptions", async () => {
    const request = makeRequest({
      json: vi.fn().mockRejectedValue(new Error("network error")),
    });

    await expect(
      validateRequestBody(request, vi.fn()),
    ).rejects.toThrow("network error");
  });
});

// ---------------------------------------------------------------------------
// validateQueryParams
// ---------------------------------------------------------------------------
describe("validateQueryParams", () => {
  it("should return validated params", () => {
    const request = makeRequest({
      url: "http://localhost:3000/api/test?name=John&age=30",
    });

    const result = validateQueryParams(request, {
      name: (v) => v.length > 0,
      age: (v) => !isNaN(Number(v)),
    });

    expect(result).toEqual({ name: "John", age: "30" });
  });

  it("should throw on missing required parameter", () => {
    const request = makeRequest({
      url: "http://localhost:3000/api/test",
    });

    expect(() =>
      validateQueryParams(request, {
        name: (v) => v.length > 0,
      }),
    ).toThrow("Invalid query parameters");
  });

  it("should throw on invalid parameter value", () => {
    const request = makeRequest({
      url: "http://localhost:3000/api/test?age=abc",
    });

    expect(() =>
      validateQueryParams(request, {
        age: (v) => !isNaN(Number(v)),
      }),
    ).toThrow("Invalid query parameters");
  });
});

// ---------------------------------------------------------------------------
// parsePagination
// ---------------------------------------------------------------------------
describe("parsePagination", () => {
  it("should return defaults when no query params", () => {
    const request = makeRequest();
    const result = parsePagination(request);

    expect(result).toEqual({ page: 1, limit: 10, offset: 0, maxLimit: 100 });
  });

  it("should parse page and limit from query params", () => {
    const request = makeRequest({
      url: "http://localhost:3000/api/test?page=3&limit=25",
    });
    const result = parsePagination(request);

    expect(result).toEqual({ page: 3, limit: 25, offset: 50, maxLimit: 100 });
  });

  it("should throw when limit exceeds custom maxLimit", () => {
    const request = makeRequest({
      url: "http://localhost:3000/api/test?page=1&limit=200",
    });

    expect(() => parsePagination(request, { maxLimit: 50 })).toThrow(
      "Invalid limit",
    );
  });

  it("should throw for invalid page (NaN)", () => {
    const request = makeRequest({
      url: "http://localhost:3000/api/test?page=abc",
    });

    expect(() => parsePagination(request)).toThrow("Invalid page number");
  });

  it("should throw for page < 1", () => {
    const request = makeRequest({
      url: "http://localhost:3000/api/test?page=0",
    });

    expect(() => parsePagination(request)).toThrow("Invalid page number");
  });

  it("should throw for invalid limit (NaN)", () => {
    const request = makeRequest({
      url: "http://localhost:3000/api/test?limit=abc",
    });

    expect(() => parsePagination(request)).toThrow("Invalid limit");
  });

  it("should throw for limit < 1", () => {
    const request = makeRequest({
      url: "http://localhost:3000/api/test?limit=0",
    });

    expect(() => parsePagination(request)).toThrow("Invalid limit");
  });

  it("should throw for limit exceeding maxLimit", () => {
    const request = makeRequest({
      url: "http://localhost:3000/api/test?limit=200",
    });

    expect(() => parsePagination(request, { maxLimit: 50 })).toThrow(
      "Invalid limit",
    );
  });
});

// ---------------------------------------------------------------------------
// successResponse
// ---------------------------------------------------------------------------
describe("successResponse", () => {
  it("should return success shape with data", async () => {
    const response = successResponse({ id: 1, name: "test" });
    const body = await response.json();

    expect(body).toEqual({
      success: true,
      data: { id: 1, name: "test" },
      message: undefined,
      meta: undefined,
    });
  });

  it("should include message and meta when provided", async () => {
    const response = successResponse([1, 2, 3], {
      message: "Fetched successfully",
      meta: { count: 3 },
    });
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.message).toBe("Fetched successfully");
    expect(body.meta).toEqual({ count: 3 });
  });
});

// ---------------------------------------------------------------------------
// paginatedResponse
// ---------------------------------------------------------------------------
describe("paginatedResponse", () => {
  it("should return paginated shape with metadata", async () => {
    const data = [{ id: 1 }, { id: 2 }];
    const pagination = { page: 1, limit: 10, offset: 0, maxLimit: 100 };

    const response = paginatedResponse(data, pagination, 25);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toEqual(data);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("should calculate totalPages correctly for exact division", async () => {
    const pagination = { page: 1, limit: 10, offset: 0, maxLimit: 100 };

    const response = paginatedResponse([], pagination, 20);
    const body = await response.json();

    expect(body.pagination.totalPages).toBe(2);
  });

  it("should include message when provided", async () => {
    const pagination = { page: 1, limit: 10, offset: 0, maxLimit: 100 };

    const response = paginatedResponse([], pagination, 0, {
      message: "No items",
    });
    const body = await response.json();

    expect(body.message).toBe("No items");
  });
});
