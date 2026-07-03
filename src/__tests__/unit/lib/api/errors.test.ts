/**
 * Unit tests for API error handling
 *
 * @module __tests__/unit/lib/api/errors.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  APIError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  PaymentError,
  RateLimitError,
  ValidationError,
  asyncHandler,
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/api/errors";
import { appLogger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  appLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

describe("APIError (base class)", () => {
  it("should create with defaults", () => {
    const err = new APIError("Something went wrong");
    expect(err.name).toBe("APIError");
    expect(err.message).toBe("Something went wrong");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(err.isOperational).toBe(true);
  });

  it("should accept custom statusCode and code", () => {
    const err = new APIError("Not found", 404, "NOT_FOUND");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });
});

describe("API error subclasses", () => {
  it("ValidationError — statusCode 400, code VALIDATION_ERROR", () => {
    const err = new ValidationError("Invalid input");
    expect(err.name).toBe("ValidationError");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("ValidationError — accepts details array", () => {
    const details = [{ field: "email", message: "Invalid email" }];
    const err = new ValidationError("Invalid input", details);
    expect(err.details).toEqual(details);
  });

  it("ValidationError — converts string details to array", () => {
    const err = new ValidationError("Invalid input", "email");
    expect(err.details).toEqual([{ field: "email", message: "Invalid input" }]);
  });

  it("AuthenticationError — statusCode 401, default message", () => {
    const err = new AuthenticationError();
    expect(err.name).toBe("AuthenticationError");
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("AUTHENTICATION_ERROR");
    expect(err.message).toBe("Authentication required");
  });

  it("AuthorizationError — statusCode 403, default message", () => {
    const err = new AuthorizationError();
    expect(err.name).toBe("AuthorizationError");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("AUTHORIZATION_ERROR");
    expect(err.message).toBe("Insufficient permissions");
  });

  it("NotFoundError — statusCode 404", () => {
    const err = new NotFoundError("User");
    expect(err.name).toBe("NotFoundError");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("User not found");
  });

  it("NotFoundError — default resource", () => {
    const err = new NotFoundError();
    expect(err.message).toBe("Resource not found");
  });

  it("ConflictError — statusCode 409", () => {
    const err = new ConflictError("Duplicate");
    expect(err.name).toBe("ConflictError");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT_ERROR");
  });

  it("RateLimitError — statusCode 429, default message", () => {
    const err = new RateLimitError();
    expect(err.name).toBe("RateLimitError");
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("RATE_LIMIT_ERROR");
    expect(err.message).toBe("Rate limit exceeded");
  });

  it("PaymentError — statusCode 402", () => {
    const err = new PaymentError("Payment declined");
    expect(err.name).toBe("PaymentError");
    expect(err.statusCode).toBe(402);
    expect(err.code).toBe("PAYMENT_ERROR");
  });
});

describe("createErrorResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a JSON response with correct status for APIError", async () => {
    const err = new ValidationError("bad input");
    const response = createErrorResponse(err);

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("message", "bad input");
    expect(body.error).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("should return 500 for non-APIError with hidden message in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = new Error("sensitive details");
    const response = createErrorResponse(err);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error.message).toBe("Internal server error");
    expect(body.error.code).toBe("INTERNAL_ERROR");
    vi.unstubAllEnvs();
  });

  it("should expose error message for non-APIError in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const err = new Error("debug info");
    const response = createErrorResponse(err);

    const body = await response.json();
    expect(body.error.message).toBe("debug info");
    vi.unstubAllEnvs();
  });

  it("should include requestId when provided", async () => {
    const err = new APIError("msg");
    const response = createErrorResponse(err, "req_xyz");

    const body = await response.json();
    expect(body.error.requestId).toBe("req_xyz");
  });

  it("should omit requestId when not provided", async () => {
    const err = new APIError("msg");
    const response = createErrorResponse(err);

    const body = await response.json();
    expect(body.error.requestId).toBeUndefined();
  });
});

describe("createSuccessResponse", () => {
  it("should return a 200 JSON response with success shape", async () => {
    const response = createSuccessResponse({ id: 1 });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      success: true,
      data: { id: 1 },
      timestamp: expect.any(String),
    });
  });

  it("should accept custom statusCode and requestId", async () => {
    const response = createSuccessResponse("ok", 201, "req_1");

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBe("ok");
    expect(body.requestId).toBe("req_1");
  });
});

describe("withErrorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the handler response on success", async () => {
    const handler = withErrorHandler(async () => {
      return createSuccessResponse("ok");
    });

    const response = await handler(null);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toBe("ok");
  });

  it("should catch errors and return formatted error response", async () => {
    const handler = withErrorHandler(async () => {
      throw new ValidationError("bad");
    });

    const response = await handler(null);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.message).toBe("bad");
  });

  it("should catch non-APIError and return 500", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("unexpected");
    });

    const response = await handler(null);
    expect(response.status).toBe(500);
  });
});

describe("asyncHandler", () => {
  it("should return the handler response on success", async () => {
    const handler = asyncHandler(async () => {
      return createSuccessResponse("ok");
    });

    const response = await handler(null);
    expect(response.status).toBe(200);
  });

  it("should catch errors and return formatted response", async () => {
    const handler = asyncHandler(async () => {
      throw new ValidationError("bad");
    });

    const response = await handler(null);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toBe("bad");
  });
});
