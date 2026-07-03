/**
 * Unit tests for logger index.
 *
 * Tests appLogger wrapper methods: debug, info, warn, error.
 * Mocks pino to verify the underlying pino instance calls.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

interface MockPinoInstance {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

const mockPinoInstance = vi.hoisted((): MockPinoInstance => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("pino", () => {
  const mockPino = vi.fn(() => mockPinoInstance);
  mockPino.stdTimeFunctions = { isoTime: "isoTime" };
  return { default: mockPino };
});

import { appLogger } from "@/lib/logger";

describe("appLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("debug", () => {
    it("calls pino.debug with message when no data", () => {
      appLogger.debug("debug message");
      expect(mockPinoInstance.debug).toHaveBeenCalledWith("debug message");
    });

    it("calls pino.debug with data then message when data provided", () => {
      appLogger.debug("debug message", { key: "value" });
      expect(mockPinoInstance.debug).toHaveBeenCalledWith(
        { key: "value" },
        "debug message",
      );
    });
  });

  describe("info", () => {
    it("calls pino.info with message when no data", () => {
      appLogger.info("info message");
      expect(mockPinoInstance.info).toHaveBeenCalledWith("info message");
    });

    it("calls pino.info with data then message when data provided", () => {
      appLogger.info("info message", { count: 42 });
      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        { count: 42 },
        "info message",
      );
    });
  });

  describe("warn", () => {
    it("calls pino.warn with message when no data", () => {
      appLogger.warn("warn message");
      expect(mockPinoInstance.warn).toHaveBeenCalledWith("warn message");
    });

    it("calls pino.warn with data then message when data provided", () => {
      appLogger.warn("warn message", { threshold: "low" });
      expect(mockPinoInstance.warn).toHaveBeenCalledWith(
        { threshold: "low" },
        "warn message",
      );
    });
  });

  describe("error", () => {
    it("calls pino.error with message when message only", () => {
      appLogger.error("error message");
      expect(mockPinoInstance.error).toHaveBeenCalledWith("error message");
    });

    it("calls pino.error with structured err object when second arg is Error", () => {
      const err = new Error("something broke");
      appLogger.error("error message", err);
      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.objectContaining({ message: "something broke" }),
        }),
        "error message",
      );
    });

    it("calls pino.error with merged data when Error and third arg provided", () => {
      const err = new Error("db failure");
      appLogger.error("error message", err, { context: "users" });
      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.objectContaining({ message: "db failure" }),
          context: "users",
        }),
        "error message",
      );
    });

    it("calls pino.error with message when non-Error second arg with no third arg", () => {
      appLogger.error("error message", { key: "value" });
      expect(mockPinoInstance.error).toHaveBeenCalledWith("error message");
    });

    it("calls pino.error with third arg as data when second arg is not Error", () => {
      appLogger.error("error message", "some-string", { extra: true });
      expect(mockPinoInstance.error).toHaveBeenCalledWith(
        { extra: true },
        "error message",
      );
    });
  });
});
