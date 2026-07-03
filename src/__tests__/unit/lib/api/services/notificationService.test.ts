/**
 * Unit tests for notificationService.
 *
 * Mocks sonner toast to verify all notification functions
 * call the correct toast method with merged options.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock sonner
// ---------------------------------------------------------------------------
vi.mock("sonner", () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  toast.warning = vi.fn();
  toast.loading = vi.fn(() => "toast-id");
  toast.dismiss = vi.fn();
  toast.promise = vi.fn(<T>(p: Promise<T>) => p);
  return { toast };
});

// Import AFTER mocks
import { toast as sonnerToast } from "sonner";
import {
  success,
  error,
  info,
  warning,
  loading,
  promise,
  custom,
  dismissAll,
  dismiss,
  successWithAction,
  errorWithAction,
  infoWithAction,
  warningWithAction,
  NotificationService,
  toast as reExportedToast,
} from "@/lib/api/services/notificationService";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("notificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("success", () => {
    it("calls toast.success with message and default success options", () => {
      success("Operation completed");
      expect(sonnerToast.success).toHaveBeenCalledWith(
        "Operation completed",
        expect.objectContaining({ duration: 3000, position: "top-right" }),
      );
    });

    it("merges custom options over defaults", () => {
      success("Done", { duration: 5000, position: "bottom-center" });
      expect(sonnerToast.success).toHaveBeenCalledWith(
        "Done",
        expect.objectContaining({ duration: 5000, position: "bottom-center" }),
      );
    });

    it("handles empty message string", () => {
      success("");
      expect(sonnerToast.success).toHaveBeenCalledWith(
        "",
        expect.any(Object),
      );
    });

    it("handles undefined options", () => {
      success("Works", undefined);
      expect(sonnerToast.success).toHaveBeenCalledWith(
        "Works",
        expect.objectContaining({ duration: 3000 }),
      );
    });
  });

  describe("error", () => {
    it("calls toast.error with message and default error options", () => {
      error("Something went wrong");
      expect(sonnerToast.error).toHaveBeenCalledWith(
        "Something went wrong",
        expect.objectContaining({ duration: 5000, position: "top-right" }),
      );
    });
  });

  describe("info", () => {
    it("calls the default toast function with message and info options", () => {
      info("Heads up");
      expect(sonnerToast).toHaveBeenCalledWith(
        "Heads up",
        expect.objectContaining({ duration: 4000, position: "top-right" }),
      );
    });
  });

  describe("warning", () => {
    it("calls toast.warning with message and warning options", () => {
      warning("Low stock");
      expect(sonnerToast.warning).toHaveBeenCalledWith(
        "Low stock",
        expect.objectContaining({ duration: 4000, position: "top-right" }),
      );
    });
  });

  describe("loading", () => {
    it("calls toast.loading and returns a dismiss function", () => {
      const dismissFn = loading("Processing...");
      expect(sonnerToast.loading).toHaveBeenCalledWith(
        "Processing...",
        expect.objectContaining({ position: "top-right" }),
      );
      dismissFn();
      expect(sonnerToast.dismiss).toHaveBeenCalledWith("toast-id");
    });
  });

  describe("promise", () => {
    it("calls toast.promise with messages and returns the promise result", async () => {
      const p = Promise.resolve("data");
      const result = await promise(p, {
        loading: "Loading...",
        success: "Done",
        error: "Failed",
      });
      expect(result).toBe("data");
      expect(sonnerToast.promise).toHaveBeenCalledWith(p, {
        loading: "Loading...",
        success: "Done",
        error: "Failed",
      });
    });

    it("works with success callback function", async () => {
      const p = Promise.resolve(42);
      await promise(p, {
        loading: "Loading...",
        success: (n: number) => `Got ${n}`,
        error: "Failed",
      });
      expect(sonnerToast.promise).toHaveBeenCalledWith(p, {
        loading: "Loading...",
        success: expect.any(Function),
        error: "Failed",
      });
    });
  });

  describe("custom", () => {
    it("calls the default toast function with message and default options", () => {
      custom("Custom notification");
      expect(sonnerToast).toHaveBeenCalledWith(
        "Custom notification",
        expect.objectContaining({ position: "top-right" }),
      );
    });
  });

  describe("dismissAll", () => {
    it("calls toast.dismiss with no arguments", () => {
      dismissAll();
      expect(sonnerToast.dismiss).toHaveBeenCalledWith();
    });
  });

  describe("dismiss", () => {
    it("calls toast.dismiss with a string id", () => {
      dismiss("toast-1");
      expect(sonnerToast.dismiss).toHaveBeenCalledWith("toast-1");
    });

    it("calls toast.dismiss with a numeric id", () => {
      dismiss(42);
      expect(sonnerToast.dismiss).toHaveBeenCalledWith(42);
    });
  });

  describe("successWithAction", () => {
    it("calls toast.success with message, action, and success options", () => {
      const action = { label: "View", onClick: vi.fn() };
      successWithAction("Created", action);
      expect(sonnerToast.success).toHaveBeenCalledWith(
        "Created",
        expect.objectContaining({
          action,
          duration: 3000,
        }),
      );
    });
  });

  describe("errorWithAction", () => {
    it("calls toast.error with message, action, and error options", () => {
      const action = { label: "Retry", onClick: vi.fn() };
      errorWithAction("Failed", action);
      expect(sonnerToast.error).toHaveBeenCalledWith(
        "Failed",
        expect.objectContaining({
          action,
          duration: 5000,
        }),
      );
    });
  });

  describe("infoWithAction", () => {
    it("calls the default toast function with message, action, and info options", () => {
      const action = { label: "See", onClick: vi.fn() };
      infoWithAction("Update", action);
      expect(sonnerToast).toHaveBeenCalledWith(
        "Update",
        expect.objectContaining({
          action,
          duration: 4000,
        }),
      );
    });
  });

  describe("warningWithAction", () => {
    it("calls toast.warning with message, action, and warning options", () => {
      const action = { label: "Save", onClick: vi.fn() };
      warningWithAction("Unsaved", action);
      expect(sonnerToast.warning).toHaveBeenCalledWith(
        "Unsaved",
        expect.objectContaining({
          action,
          duration: 4000,
        }),
      );
    });
  });

  describe("toast re-export", () => {
    it("re-exports the sonner toast object", () => {
      expect(reExportedToast).toBe(sonnerToast);
    });
  });

  describe("NotificationService object", () => {
    it("exposes all functions", () => {
      expect(NotificationService.success).toBe(success);
      expect(NotificationService.error).toBe(error);
      expect(NotificationService.info).toBe(info);
      expect(NotificationService.warning).toBe(warning);
      expect(NotificationService.loading).toBe(loading);
      expect(NotificationService.promise).toBe(promise);
      expect(NotificationService.custom).toBe(custom);
      expect(NotificationService.dismissAll).toBe(dismissAll);
      expect(NotificationService.dismiss).toBe(dismiss);
      expect(NotificationService.successWithAction).toBe(successWithAction);
      expect(NotificationService.errorWithAction).toBe(errorWithAction);
      expect(NotificationService.infoWithAction).toBe(infoWithAction);
      expect(NotificationService.warningWithAction).toBe(warningWithAction);
    });
  });
});
