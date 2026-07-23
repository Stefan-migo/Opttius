/**
 * Unit tests for errorService.
 *
 * Tests the pure functions for error extraction, classification,
 * user-friendly messages, and the handleApiError / withErrorHandling
 * wrappers (which interact with toast and logger).
 */

import { beforeEach,describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — hoisted before imports
// ---------------------------------------------------------------------------
vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { toast } from "sonner";

import {
  classifyError,
  createStandardError,
  ErrorService,
  extractErrorMessage,
  getUserFriendlyMessage,
  handleApiError,
  withErrorHandling,
} from "@/lib/api/services/errorService";
import { appLogger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("extractErrorMessage", () => {
  it("extracts message from Error object", () => {
    expect(extractErrorMessage(new Error("Something broke"))).toBe(
      "Something broke",
    );
  });

  it("returns the string directly", () => {
    expect(extractErrorMessage("just a string")).toBe("just a string");
  });

  it("extracts from object with message property", () => {
    expect(extractErrorMessage({ message: "from object" })).toBe(
      "from object",
    );
  });

  it("extracts from object with error string property", () => {
    expect(extractErrorMessage({ error: "API error", details: "timeout" })).toBe(
      "API error: timeout",
    );
  });

  it("extracts from nested error.message", () => {
    expect(
      extractErrorMessage({ error: { message: "nested message" } }),
    ).toBe("nested message");
  });

  it("returns fallback for null/undefined", () => {
    expect(extractErrorMessage(null)).toBe("An unexpected error occurred");
    expect(extractErrorMessage(undefined)).toBe("An unexpected error occurred");
  });

  it("returns fallback for unsupported types", () => {
    expect(extractErrorMessage(42)).toBe("An unexpected error occurred");
  });
});

describe("classifyError", () => {
  it("classifies network errors", () => {
    expect(classifyError(new Error("Network error"))).toBe("network");
    expect(classifyError("fetch failed")).toBe("network");
    expect(classifyError("connection refused")).toBe("network");
  });

  it("classifies authentication errors", () => {
    expect(classifyError("unauthorized")).toBe("authentication");
    expect(classifyError("authentication failed")).toBe("authentication");
    expect(classifyError("not authenticated")).toBe("authentication");
  });

  it("classifies authorization errors", () => {
    expect(classifyError("forbidden")).toBe("authorization");
    expect(classifyError("permission denied")).toBe("authorization");
    expect(classifyError("not authorized")).toBe("authorization");
  });

  it("classifies validation errors", () => {
    expect(classifyError("validation error")).toBe("validation");
    expect(classifyError("invalid input")).toBe("validation");
    expect(classifyError("required field")).toBe("validation");
  });

  it("classifies not_found errors", () => {
    expect(classifyError("not found")).toBe("not_found");
    expect(classifyError("404 Not Found")).toBe("not_found");
  });

  it("classifies server errors", () => {
    expect(classifyError("server error")).toBe("server");
    expect(classifyError("500 Internal Server Error")).toBe("server");
    expect(classifyError("internal error")).toBe("server");
  });

  it("returns unknown for unrecognized errors", () => {
    expect(classifyError("some random error")).toBe("unknown");
  });

  it("returns unknown for null", () => {
    expect(classifyError(null)).toBe("unknown");
  });
});

describe("getUserFriendlyMessage", () => {
  const base = {
    message: "",
    userMessage: "",
    timestamp: new Date().toISOString(),
  };

  it("returns Spanish messages per type", () => {
    expect(getUserFriendlyMessage({ ...base, type: "network" })).toBe(
      "Error de conexión",
    );
    expect(getUserFriendlyMessage({ ...base, type: "authentication" })).toBe(
      "Error de autenticación",
    );
    expect(getUserFriendlyMessage({ ...base, type: "authorization" })).toBe(
      "No tienes permiso para realizar esta acción",
    );
    expect(getUserFriendlyMessage({ ...base, type: "validation" })).toBe(
      "Error de validación",
    );
    expect(getUserFriendlyMessage({ ...base, type: "not_found" })).toBe(
      "Recurso no encontrado",
    );
    expect(getUserFriendlyMessage({ ...base, type: "server" })).toBe(
      "Error del servidor",
    );
    expect(getUserFriendlyMessage({ ...base, type: "unknown" })).toBe(
      "Error inesperado",
    );
  });
});

describe("createStandardError", () => {
  it("creates a StandardError with type, message and userMessage", () => {
    const result = createStandardError(new Error("not found"), "Customer API");

    expect(result.type).toBe("not_found");
    expect(result.message).toContain("[Customer API]");
    expect(result.message).toContain("not found");
    expect(result.userMessage).toBe("Recurso no encontrado");
    expect(result.timestamp).toBeDefined();
  });

  it("creates StandardError without context prefix", () => {
    const result = createStandardError("invalid input");

    expect(result.type).toBe("validation");
    expect(result.message).toBe("invalid input");
  });
});

describe("handleApiError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs error and shows toast", () => {
    const result = handleApiError(new Error("Network failure"), "Payment API");

    expect(result.type).toBe("network");
    expect(result.message).toContain("[Payment API]");

    expect(appLogger.error).toHaveBeenCalledWith(
      "[Payment API] Error:",
      expect.any(Error),
    );
    expect(toast.error).toHaveBeenCalledWith("Error de conexión", {
      description: expect.stringContaining("[Payment API]"),
      duration: 5000,
    });
  });

  it("skips toast when showToast is false", () => {
    handleApiError("server crash", "API", false);

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("defaults context to 'API'", () => {
    const result = handleApiError("server error");

    expect(result.message).toContain("[API]");
  });
});

describe("withErrorHandling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns result on success", async () => {
    const result = await withErrorHandling(async () => "ok", "Test");

    expect(result).toBe("ok");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("returns null and handles error on rejection", async () => {
    const result = await withErrorHandling(async () => {
      throw new Error("fail");
    }, "Test");

    expect(result).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Convenience handler functions
// ---------------------------------------------------------------------------
describe("convenience error handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleValidationError delegates to handleApiError", () => {
    const result = ErrorService.handleValidationError("Invalid email");
    expect(result.type).toBe("validation");
  });

  it("handleNetworkError delegates to handleApiError", () => {
    const result = ErrorService.handleNetworkError("connection lost");
    expect(result.type).toBe("network");
  });

  it("handleAuthenticationError delegates and shows toast", () => {
    const result = ErrorService.handleAuthenticationError("unauthorized");
    expect(result.type).toBe("authentication");
    expect(toast.error).toHaveBeenCalled();
  });

  it("handleAuthorizationError delegates to handleApiError", () => {
    const result = ErrorService.handleAuthorizationError("forbidden");
    expect(result.type).toBe("authorization");
  });

  it("handleServerError delegates to handleApiError", () => {
    const result = ErrorService.handleServerError("500");
    expect(result.type).toBe("server");
  });

  it("handleGenericError delegates to handleApiError", () => {
    const result = ErrorService.handleGenericError("something");
    expect(result.type).toBe("unknown");
  });
});

describe("ErrorService namespace", () => {
  it("exports all functions", () => {
    expect(ErrorService.extractErrorMessage).toBe(extractErrorMessage);
    expect(ErrorService.classifyError).toBe(classifyError);
    expect(ErrorService.createStandardError).toBe(createStandardError);
    expect(ErrorService.handleApiError).toBe(handleApiError);
    expect(ErrorService.getUserFriendlyMessage).toBe(getUserFriendlyMessage);
    expect(ErrorService.withErrorHandling).toBe(withErrorHandling);
  });
});
