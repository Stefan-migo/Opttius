/**
 * Unit tests for comprehensive error handling system
 *
 * @module __tests__/unit/lib/errors/comprehensive-handler.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

import { appLogger } from "@/lib/logger";
import * as Errors from "@/lib/errors/comprehensive-handler";

// Mock logger
vi.mock("@/lib/logger", () => ({
  appLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

const {
  ApplicationError,
  AuthenticationError,
  AuthorizationError,
  BusinessLogicError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  formatErrorResponse,
  generateRequestId,
  handleApiError,
  logError,
  mapPostgresError,
  NotFoundError,
  PaymentError,
  RateLimitError,
  safeExecute,
  sanitizeInput,
  validateRequiredFields,
  validateTypes,
  withErrorHandling,
} = Errors;

// Re-export ValidationError for convenience
const ValidationError = Errors.ValidationError;

describe("ApplicationError (base)", () => {
  it("should create an ApplicationError with correct defaults", () => {
    const err = new ApplicationError("Test error", {
      code: "TEST_ERROR",
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApplicationError);
    expect(err.name).toBe("ApplicationError");
    expect(err.message).toBe("Test error");
    expect(err.code).toBe("TEST_ERROR");
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
    expect(err.details).toBeUndefined();
  });

  it("should accept custom statusCode, isOperational, details, and cause", () => {
    const cause = new Error("root cause");
    const err = new ApplicationError("Custom error", {
      code: "CUSTOM",
      statusCode: 418,
      isOperational: false,
      details: { key: "value" },
      cause,
    });

    expect(err.statusCode).toBe(418);
    expect(err.isOperational).toBe(false);
    expect(err.details).toEqual({ key: "value" });
    expect((err as unknown as { cause: Error }).cause).toBe(cause);
  });
});

describe("Error subclasses", () => {
  it("ValidationError — statusCode 400, code VALIDATION_ERROR", () => {
    const err = new ValidationError("Invalid input");
    expect(err).toBeInstanceOf(ApplicationError);
    expect(err.name).toBe("ValidationError");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.statusCode).toBe(400);
  });

  it("ValidationError — accepts details", () => {
    const err = new ValidationError("Invalid input", {
      fields: ["email"],
    });
    expect(err.details).toEqual({ fields: ["email"] });
  });

  it("AuthenticationError — statusCode 401, default message", () => {
    const err = new AuthenticationError();
    expect(err.name).toBe("AuthenticationError");
    expect(err.code).toBe("AUTHENTICATION_ERROR");
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Authentication required");
  });

  it("AuthenticationError — accepts custom message and details", () => {
    const err = new AuthenticationError("Custom auth message", {
      ip: "127.0.0.1",
    });
    expect(err.message).toBe("Custom auth message");
    expect(err.details).toEqual({ ip: "127.0.0.1" });
  });

  it("AuthorizationError — statusCode 403, default message", () => {
    const err = new AuthorizationError();
    expect(err.name).toBe("AuthorizationError");
    expect(err.code).toBe("AUTHORIZATION_ERROR");
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Insufficient permissions");
  });

  it("NotFoundError — statusCode 404, default message", () => {
    const err = new NotFoundError();
    expect(err.name).toBe("NotFoundError");
    expect(err.code).toBe("NOT_FOUND_ERROR");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Resource not found");
  });

  it("ConflictError — statusCode 409", () => {
    const err = new ConflictError("Duplicate entry");
    expect(err.name).toBe("ConflictError");
    expect(err.code).toBe("CONFLICT_ERROR");
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Duplicate entry");
  });

  it("PaymentError — statusCode 400", () => {
    const err = new PaymentError("Payment failed");
    expect(err.name).toBe("PaymentError");
    expect(err.code).toBe("PAYMENT_ERROR");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Payment failed");
  });

  it("DatabaseError — statusCode 500, accepts cause", () => {
    const cause = new Error("connection refused");
    const err = new DatabaseError("DB operation failed", undefined, cause);
    expect(err.name).toBe("DatabaseError");
    expect(err.code).toBe("DATABASE_ERROR");
    expect(err.statusCode).toBe(500);
    expect((err as unknown as { cause: Error }).cause).toBe(cause);
  });

  it("RateLimitError — statusCode 429, default message", () => {
    const err = new RateLimitError();
    expect(err.name).toBe("RateLimitError");
    expect(err.code).toBe("RATE_LIMIT_ERROR");
    expect(err.statusCode).toBe(429);
    expect(err.message).toBe("Rate limit exceeded");
  });

  it("ExternalServiceError — statusCode 502, includes service name", () => {
    const err = new ExternalServiceError(
      "Service unavailable",
      "MercadoPago",
    );
    expect(err.name).toBe("ExternalServiceError");
    expect(err.code).toBe("EXTERNAL_SERVICE_ERROR");
    expect(err.statusCode).toBe(502);
    expect(err.message).toBe("Service unavailable");
    expect(err.details).toHaveProperty("service", "MercadoPago");
  });

  it("BusinessLogicError — statusCode 422", () => {
    const err = new BusinessLogicError(
      "Cannot cancel completed order",
    );
    expect(err.name).toBe("BusinessLogicError");
    expect(err.code).toBe("BUSINESS_LOGIC_ERROR");
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe("Cannot cancel completed order");
  });
});

describe("handleApiError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 for ValidationError", () => {
    const result = handleApiError(new ValidationError("bad input"));
    expect(result.statusCode).toBe(400);
    expect(result.response.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 401 for AuthenticationError", () => {
    const result = handleApiError(new AuthenticationError());
    expect(result.statusCode).toBe(401);
  });

  it("should return 403 for AuthorizationError", () => {
    const result = handleApiError(new AuthorizationError());
    expect(result.statusCode).toBe(403);
  });

  it("should return 404 for NotFoundError", () => {
    const result = handleApiError(new NotFoundError());
    expect(result.statusCode).toBe(404);
  });

  it("should return 409 for ConflictError", () => {
    const result = handleApiError(new ConflictError("dup"));
    expect(result.statusCode).toBe(409);
  });

  it("should return 429 for RateLimitError", () => {
    const result = handleApiError(new RateLimitError());
    expect(result.statusCode).toBe(429);
  });

  it("should return 500 for unknown Error instances", () => {
    const result = handleApiError(new Error("something broke"));
    expect(result.statusCode).toBe(500);
    expect(result.response.error.code).toBe("INTERNAL_ERROR");
  });

  it("should return 500 for unexpected non-Error shapes", () => {
    const result = handleApiError("just a string");
    expect(result.statusCode).toBe(500);
    expect(result.response.error.code).toBe("INTERNAL_ERROR");
  });

  it("should include requestId in response when provided", () => {
    const result = handleApiError(
      new ValidationError("bad"),
      "req_abc123",
    );
    expect(result.response.error.requestId).toBe("req_abc123");
  });
});

describe("mapPostgresError", () => {
  it("should map 23505 (unique_violation) to ConflictError", () => {
    const err = mapPostgresError({
      code: "23505",
      constraint: "users_email_key",
    });
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Resource already exists");
  });

  it("should map 23503 (foreign_key_violation) to BusinessLogicError", () => {
    const err = mapPostgresError({
      code: "23503",
      constraint: "orders_customer_id_fkey",
    });
    expect(err).toBeInstanceOf(BusinessLogicError);
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe("Referenced resource does not exist");
  });

  it("should map 23514 (check_violation) to ValidationError", () => {
    const err = mapPostgresError({
      code: "23514",
      constraint: "orders_amount_check",
    });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Data validation failed");
  });

  it("should map 42P01 (undefined_table) to DatabaseError", () => {
    const err = mapPostgresError({
      code: "42P01",
      message: 'relation "users" does not exist',
    });
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err.statusCode).toBe(500);
  });

  it("should map unknown codes to DatabaseError (500)", () => {
    const err = mapPostgresError({
      code: "XX000",
      message: "internal error",
    });
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err.statusCode).toBe(500);
  });
});

describe("withErrorHandling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the resolved value on success", async () => {
    const result = await withErrorHandling(() =>
      Promise.resolve("ok"),
    );
    expect(result).toBe("ok");
  });

  it("should re-throw caught errors by default", async () => {
    await expect(
      withErrorHandling(() =>
        Promise.reject(new Error("fail")),
      ),
    ).rejects.toThrow("fail");
  });

  it("should return defaultValue when provided on error", async () => {
    const result = await withErrorHandling(
      () => Promise.reject(new Error("fail")),
      { defaultValue: "fallback" },
    );
    expect(result).toBe("fallback");
  });

  it("should call transformError when provided", async () => {
    await expect(
      withErrorHandling(
        () => Promise.reject(new Error("original")),
        {
          transformError: () =>
            new ApplicationError("transformed", {
              code: "TRANSFORMED",
              statusCode: 400,
            }),
        },
      ),
    ).rejects.toThrow("transformed");
  });

  it("should suppress logs when suppressLogs is true", async () => {
    await expect(
      withErrorHandling(
        () => Promise.reject(new Error("silent")),
        { suppressLogs: true },
      ),
    ).rejects.toThrow("silent");

    expect(appLogger.warn).not.toHaveBeenCalled();
  });
});

describe("safeExecute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the value on success", () => {
    const result = safeExecute(() => "ok");
    expect(result).toBe("ok");
  });

  it("should re-throw errors by default", () => {
    expect(() =>
      safeExecute(() => {
        throw new Error("fail");
      }),
    ).toThrow("fail");
  });

  it("should return defaultValue when provided on error", () => {
    const result = safeExecute(
      () => {
        throw new Error("fail");
      },
      { defaultValue: "fallback" },
    );
    expect(result).toBe("fallback");
  });

  it("should throw transformed error when transformError is provided", () => {
    expect(() =>
      safeExecute(
        () => {
          throw new Error("original");
        },
        {
          transformError: () =>
            new ApplicationError("transformed", {
              code: "TRANSFORMED",
              statusCode: 400,
            }),
        },
      ),
    ).toThrow("transformed");
  });

  it("should suppress logs when suppressLogs is true", () => {
    expect(() =>
      safeExecute(
        () => {
          throw new Error("silent");
        },
        { suppressLogs: true },
      ),
    ).toThrow();

    expect(appLogger.warn).not.toHaveBeenCalled();
  });
});

describe("validateRequiredFields", () => {
  it("should pass when all required fields are present", () => {
    expect(() =>
      validateRequiredFields(
        { name: "John", email: "j@ex.com" },
        ["name", "email"],
      ),
    ).not.toThrow();
  });

  it("should throw ValidationError when fields are missing", () => {
    expect(() =>
      validateRequiredFields({ name: "John" }, ["name", "email"]),
    ).toThrow(ValidationError);
  });

  it("should throw when field is empty string", () => {
    expect(() =>
      validateRequiredFields({ name: "" }, ["name"]),
    ).toThrow(ValidationError);
  });

  it("should throw when field is null", () => {
    expect(() =>
      validateRequiredFields({ name: null }, ["name"]),
    ).toThrow(ValidationError);
  });
});

describe("validateTypes", () => {
  it("should pass when types match", () => {
    expect(() =>
      validateTypes(
        { name: "John", age: 30 },
        { name: "string", age: "number" },
      ),
    ).not.toThrow();
  });

  it("should throw ValidationError on type mismatch", () => {
    expect(() =>
      validateTypes({ age: "30" }, { age: "number" }),
    ).toThrow(ValidationError);
  });

  it("should pass when an optional field is undefined", () => {
    expect(() =>
      validateTypes({}, { name: "string" }),
    ).not.toThrow();
  });

  it("should detect arrays correctly", () => {
    expect(() =>
      validateTypes({ items: [1, 2] }, { items: "array" }),
    ).not.toThrow();
    expect(() =>
      validateTypes({ items: "not-array" }, { items: "array" }),
    ).toThrow(ValidationError);
  });
});

describe("sanitizeInput", () => {
  it("should pass valid data through", () => {
    const data = sanitizeInput(
      { name: "John", age: 30 },
      {
        required: ["name"],
        types: { name: "string", age: "number" },
      },
    );
    expect(data).toEqual({ name: "John", age: 30 });
  });

  it("should throw on missing required field", () => {
    expect(() =>
      sanitizeInput(
        { name: "John" },
        { required: ["name", "email"] },
      ),
    ).toThrow(ValidationError);
  });

  it("should throw on type mismatch", () => {
    expect(() =>
      sanitizeInput({ name: 123 }, { types: { name: "string" } }),
    ).toThrow(ValidationError);
  });

  it("should throw when string exceeds maxLength", () => {
    expect(() =>
      sanitizeInput(
        { name: "a".repeat(101) },
        { maxLength: { name: 100 } },
      ),
    ).toThrow(ValidationError);
  });

  it("should pass when string is within maxLength", () => {
    expect(() =>
      sanitizeInput(
        { name: "a".repeat(50) },
        { maxLength: { name: 100 } },
      ),
    ).not.toThrow();
  });
});

describe("generateRequestId", () => {
  it("should return a UUID v4 string", () => {
    const id = generateRequestId();
    expect(typeof id).toBe("string");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("should generate unique ids", () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).not.toBe(id2);
  });
});

describe("formatErrorResponse", () => {
  it("should format ApplicationError into ErrorResponse shape", () => {
    const err = new ValidationError("bad input", {
      field: "email",
    });
    const response = formatErrorResponse(err, "req_123");

    expect(response).toHaveProperty("error");
    expect(response.error).toHaveProperty("code", "VALIDATION_ERROR");
    expect(response.error).toHaveProperty("message", "bad input");
    expect(response.error).toHaveProperty("details");
    expect(response.error).toHaveProperty("timestamp");
    expect(response.error).toHaveProperty("requestId", "req_123");
  });

  it("should omit requestId when not provided", () => {
    const err = new ApplicationError("msg", { code: "X" });
    const response = formatErrorResponse(err);
    expect(response.error.requestId).toBeUndefined();
  });
});

describe("logError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log operational errors at warn level", () => {
    const err = new ValidationError("bad input");
    logError(err);

    expect(appLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Operational error"),
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        statusCode: 400,
      }),
    );
  });

  it("should log non-operational errors at error level", () => {
    const err = new Error("unexpected");
    logError(err);

    expect(appLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected application error"),
      err,
      expect.objectContaining({
        errorName: "Error",
        errorMessage: "unexpected",
      }),
    );
  });

  it("should include context when provided", () => {
    const err = new ValidationError("bad");
    logError(err, { route: "/api/test" });

    expect(appLogger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ route: "/api/test" }),
    );
  });
});
