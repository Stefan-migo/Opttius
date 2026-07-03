/**
 * Unit tests for enhanced-error-handler middleware
 *
 * Tests withEnhancedErrorHandling, withEnhancedValidation,
 * RateLimitError, and TimeoutError.
 *
 * @module __tests__/unit/lib/middleware/enhanced-error-handler.test
 */

import { z } from "zod";
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

vi.mock("@/lib/error-reporting", () => ({
  reportApiError: vi.fn().mockResolvedValue(undefined),
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
  ValidationError: class ValError extends Error {
    code = "VALIDATION_ERROR";
    statusCode = 400;
    details?: Record<string, unknown>;
    constructor(message: string, details?: Record<string, unknown>) {
      super(message);
      this.name = "ValidationError";
      this.details = details;
    }
  },
  generateRequestId: vi.fn(() => "fixed-req-id"),
  handleApiError: vi.fn(),
}));

// --- Imports (after mocks) ---

import { reportApiError } from "@/lib/error-reporting";
import {
  handleApiError,
  ValidationError,
} from "@/lib/errors/comprehensive-handler";
import {
  RateLimitError,
  TimeoutError,
  withEnhancedErrorHandling,
  withEnhancedValidation,
} from "@/lib/middleware/enhanced-error-handler";

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
// withEnhancedErrorHandling
// ---------------------------------------------------------------------------
describe("withEnhancedErrorHandling", () => {
  it("should return handler response on success", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withEnhancedErrorHandling(handler);
    const request = makeRequest();

    const response = await wrapped(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it("should add X-Request-ID header on success", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withEnhancedErrorHandling(handler);
    const request = makeRequest();

    const response = await wrapped(request);

    expect(response.headers.get("X-Request-ID")).toBe("fixed-req-id");
  });

  it("should report errors with status >= 500 via reportApiError", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "INTERNAL_ERROR",
          message: "server error",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "fixed-req-id",
        },
      },
      statusCode: 500,
    });

    const handler = vi.fn().mockRejectedValue(new Error("server error"));
    const wrapped = withEnhancedErrorHandling(handler);
    const request = makeRequest();

    await wrapped(request);

    expect(reportApiError).toHaveBeenCalledOnce();
    expect(reportApiError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        requestId: "fixed-req-id",
        endpoint: request.url,
        method: "GET",
        statusCode: 500,
      }),
    );
  });

  it("should NOT report client errors (4xx) by default", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "VALIDATION_ERROR",
          message: "bad request",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "fixed-req-id",
        },
      },
      statusCode: 400,
    });

    const handler = vi.fn().mockRejectedValue(new Error("bad request"));
    const wrapped = withEnhancedErrorHandling(handler);
    const request = makeRequest();

    await wrapped(request);

    expect(reportApiError).not.toHaveBeenCalled();
  });

  it("should respect custom reportThreshold", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "NOT_FOUND",
          message: "not found",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "fixed-req-id",
        },
      },
      statusCode: 404,
    });

    const handler = vi.fn().mockRejectedValue(new Error("not found"));
    const wrapped = withEnhancedErrorHandling(handler, {
      reportThreshold: 400,
    });
    const request = makeRequest();

    await wrapped(request);

    expect(reportApiError).toHaveBeenCalledOnce();
  });

  it("should handle AuthenticationError on missing auth header", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "AUTHENTICATION_ERROR",
          message: "Missing or invalid authorization header",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "fixed-req-id",
        },
      },
      statusCode: 401,
    });

    const handler = vi.fn();
    const wrapped = withEnhancedErrorHandling(handler, {
      requireAuth: true,
    });
    const request = makeRequest(); // No auth header

    const response = await wrapped(request);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("should disable reporting when enableReporting is false", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "INTERNAL_ERROR",
          message: "server error",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "fixed-req-id",
        },
      },
      statusCode: 500,
    });

    const handler = vi.fn().mockRejectedValue(new Error("server error"));
    const wrapped = withEnhancedErrorHandling(handler, {
      enableReporting: false,
    });
    const request = makeRequest();

    await wrapped(request);

    expect(reportApiError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// withEnhancedValidation
// ---------------------------------------------------------------------------
describe("withEnhancedValidation", () => {
  it("should validate and call handler on valid data", async () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const innerHandler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withEnhancedValidation(schema, innerHandler);

    const request = makeRequest({
      method: "POST",
      json: vi.fn().mockResolvedValue({ name: "John", age: 30 }),
    });

    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(innerHandler).toHaveBeenCalledWith(
      { name: "John", age: 30 },
      request,
      { requestId: "fixed-req-id" },
    );
  });

  it("should throw ValidationError on Zod parse failure", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "fixed-req-id",
        },
      },
      statusCode: 400,
    });

    const schema = z.object({ name: z.string() });
    const innerHandler = vi.fn();
    const wrapped = withEnhancedValidation(schema, innerHandler);

    const request = makeRequest({
      method: "POST",
      json: vi.fn().mockResolvedValue({ name: 123 }),
    });

    const response = await wrapped(request);

    expect(response.status).toBe(400);
    expect(innerHandler).not.toHaveBeenCalled();
  });

  it("should not report validation errors", async () => {
    vi.mocked(handleApiError).mockReturnValue({
      response: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          timestamp: "2024-01-01T00:00:00.000Z",
          requestId: "fixed-req-id",
        },
      },
      statusCode: 400,
    });

    const schema = z.object({ name: z.string() });
    const wrapped = withEnhancedValidation(schema, vi.fn());

    const request = makeRequest({
      method: "POST",
      json: vi.fn().mockResolvedValue({ name: 123 }),
    });

    await wrapped(request);

    // Validation errors have enableReporting forced to false by default
    expect(reportApiError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// RateLimitError
// ---------------------------------------------------------------------------
describe("RateLimitError", () => {
  it("should have default message, code, and statusCode", () => {
    const err = new RateLimitError();

    expect(err.name).toBe("RateLimitError");
    expect(err.message).toBe("Too many requests");
    expect(err.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(err.statusCode).toBe(429);
  });

  it("should accept custom message and retryAfter", () => {
    const err = new RateLimitError("Slow down", { retryAfter: 60 });

    expect(err.message).toBe("Slow down");
    expect(err.details).toEqual({ retryAfter: 60 });
  });
});

// ---------------------------------------------------------------------------
// TimeoutError
// ---------------------------------------------------------------------------
describe("TimeoutError", () => {
  it("should have default message, code, and statusCode", () => {
    const err = new TimeoutError();

    expect(err.name).toBe("TimeoutError");
    expect(err.message).toBe("Request timeout");
    expect(err.code).toBe("REQUEST_TIMEOUT");
    expect(err.statusCode).toBe(408);
  });

  it("should accept custom message and timeoutMs", () => {
    const err = new TimeoutError("Timed out", { timeoutMs: 5000 });

    expect(err.message).toBe("Timed out");
    expect(err.details).toEqual({ timeoutMs: 5000 });
  });
});
