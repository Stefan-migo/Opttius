/**
 * Unit tests for error-reporting core.
 *
 * Tests reportError, wrapper functions, config utilities, and global handlers.
 * Mocks logger to verify calls without side effects.
 */

import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — vi.mock is hoisted, this import will get the mocked version
// ---------------------------------------------------------------------------

vi.mock("@/lib/logger", () => ({
  appLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  ErrorBoundaryReporter,
  getErrorReportingStatus,
  initializeErrorReporting,
  reportApiError,
  reportDatabaseError,
  reportError,
  reportUnhandledError,
  setupGlobalErrorHandlers,
  updateErrorReportingConfig,
} from "@/lib/error-reporting/core";
// Re-import to get the mocked logger reference for assertions
// vi.mock hoisting ensures this is the mock, not the real module
import { appLogger as mockLogger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeError(message = "test error"): Error {
  return new Error(message);
}

function enableReporting(): void {
  updateErrorReportingConfig({
    enabled: true,
    integrations: {
      datadog: { apiKey: "test-key", enabled: false },
      custom: { endpoint: "", enabled: false },
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("initializeErrorReporting", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs initialization message", () => {
    initializeErrorReporting();
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Error reporting system initialized",
      expect.objectContaining({ enabled: false, environment: "test" }),
    );
  });

  it("merges partial config on init", () => {
    initializeErrorReporting({ serviceName: "custom-service" });
    const status = getErrorReportingStatus();
    expect(status).toBeDefined();
  });
});

describe("reportError", () => {
  beforeEach(() => {
    enableReporting();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns early when reporting is disabled", async () => {
    updateErrorReportingConfig({ enabled: false });
    await reportError({
      error: makeError(),
      severity: "low",
      timestamp: new Date(),
    });
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it("logs at debug level for low severity", async () => {
    await reportError({
      error: makeError("low severity"),
      severity: "low",
      timestamp: new Date(),
    });
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it("logs at info level for medium severity", async () => {
    await reportError({
      error: makeError("medium severity"),
      severity: "medium",
      timestamp: new Date(),
    });
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it("logs at warn level for high severity", async () => {
    await reportError({
      error: makeError("high severity"),
      severity: "high",
      userId: "user-1",
      timestamp: new Date(),
    });
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it("logs at error level for critical severity", async () => {
    await reportError({
      error: makeError("critical severity"),
      severity: "critical",
      timestamp: new Date(),
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it("includes context and metadata in log call", async () => {
    await reportError({
      error: makeError("with context"),
      context: { route: "/api/test" },
      severity: "high",
      userId: "user-1",
      requestId: "req-1",
      timestamp: new Date("2024-01-01"),
    });
    const callArgs = mockLogger.warn.mock.calls[0];

    expect(callArgs[0]).toBe("Error Report [HIGH]: with context");
  });

  it("handles Datadog integration failure gracefully", async () => {
    updateErrorReportingConfig({
      enabled: true,
      integrations: {
        datadog: { apiKey: "test-key", enabled: true },
        custom: { endpoint: "", enabled: false },
      },
    });
    (global.fetch as unknown).mockRejectedValueOnce(new Error("network error"));

    await reportError({
      error: makeError("datadog fail"),
      severity: "medium",
      timestamp: new Date(),
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Failed to report to Datadog",
      expect.any(Error),
    );
  });

  it("handles custom endpoint integration failure gracefully", async () => {
    updateErrorReportingConfig({
      enabled: true,
      integrations: {
        datadog: { apiKey: "", enabled: false },
        custom: {
          endpoint: "https://custom.example.com/errors",
          enabled: true,
        },
      },
    });
    (global.fetch as unknown).mockRejectedValueOnce(new Error("timeout"));

    await reportError({
      error: makeError("custom fail"),
      severity: "high",
      timestamp: new Date(),
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Failed to report to custom endpoint",
      expect.any(Error),
    );
  });
});

describe("reportApiError", () => {
  beforeEach(() => {
    enableReporting();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reports with severity high (warn) for 5xx status codes", async () => {
    await reportApiError(makeError("server error"), {
      statusCode: 500,
      endpoint: "/api/users",
      method: "POST",
    });
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it("reports with severity medium (info) for 4xx status codes", async () => {
    await reportApiError(makeError("client error"), {
      statusCode: 400,
    });
    expect(mockLogger.info).toHaveBeenCalled();
  });
});

describe("reportDatabaseError", () => {
  beforeEach(() => {
    enableReporting();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reports at warn level (high severity) with operation context", async () => {
    await reportDatabaseError(makeError("db error"), {
      operation: "SELECT",
      tableName: "users",
    });
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});

describe("reportUnhandledError", () => {
  beforeEach(() => {
    enableReporting();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reports at error level (critical severity)", async () => {
    await reportUnhandledError(makeError("unhandled"), {
      type: "global_error",
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe("ErrorBoundaryReporter", () => {
  beforeEach(() => {
    enableReporting();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("captures error with React error info", async () => {
    const errorInfo: React.ErrorInfo = {
      componentStack: "\n    at Component\n    at App",
    };
    await ErrorBoundaryReporter.captureError(
      makeError("react error"),
      errorInfo,
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});

describe("setupGlobalErrorHandlers", () => {
  it("adds unhandledrejection and error listeners", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    setupGlobalErrorHandlers();
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "unhandledrejection",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
  });
});

describe("getErrorReportingStatus", () => {
  it("returns enabled status and active integrations", () => {
    enableReporting();
    const status = getErrorReportingStatus();
    expect(status).toHaveProperty("enabled", true);
    expect(Array.isArray(status.integrations)).toBe(true);
  });
});
